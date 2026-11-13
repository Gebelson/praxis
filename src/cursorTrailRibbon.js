// Continuous fluid silhouette: hollow violet rim and a tapered white core.
// A small offscreen region contains all blur passes, not the whole viewport.
export class CursorTrailRibbon {
  constructor(){this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');}
  contour(points,length,radius,core=false){
    const path=new Path2D(),left=[],right=[];
    for(let i=0;i<points.length;i++){
      const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
      const dx=after.x-before.x,dy=after.y-before.y,n=Math.hypot(dx,dy)||1,u=Math.min(1,p.distance/length);
      const r=core?radius*Math.sqrt(Math.max(0,1-u*u))*(.9+.25*Math.sin(u*Math.PI)):radius*Math.pow(1-u,.7)*(1+.35*Math.sin(u*Math.PI));
      left.push({x:p.x-dy/n*r,y:p.y+dx/n*r});right.push({x:p.x+dy/n*r,y:p.y-dx/n*r});
    }
    path.moveTo(left[0].x,left[0].y);
    const side=list=>{for(let i=1;i<list.length;i++){const p=list[i],next=list[i+1]||p;path.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);}};
    side(left);const last=right.at(-1);path.lineTo(last.x,last.y);side([...right].reverse());
    const head=points[0],next=points[1]||{x:head.x-1,y:head.y},dx=head.x-next.x,dy=head.y-next.y,n=Math.hypot(dx,dy)||1;
    path.quadraticCurveTo(head.x+dx/n*radius*1.7,head.y+dy/n*radius*1.7,left[0].x,left[0].y);path.closePath();return path;
  }
  draw(target,history,now,rect,scale,top){
    const newest=history.at(-1);if(!newest)return;
    const opacity=Math.pow(Math.max(0,1-(now-newest.t)/1200),1.25);
    const points=[];let distance=0;
    for(let i=history.length-1;i>=0;i--){
      const p=history[i],x=(p.x-rect.left)/scale,y=(p.y-rect.top)/scale-top;
      if(points.length){const previous=points.at(-1),step=Math.hypot(x-previous.x,y-previous.y);if(step<2/scale)continue;distance+=step;}
      points.push({x,y,distance});if(distance>=460/scale)break;
    }
    if(points.length<2){const h=points[0];points.push({x:h.x-35/scale,y:h.y,distance:35/scale});distance=35/scale;}
    const radius=38/scale,margin=75/scale;
    const x=Math.floor(Math.min(...points.map(p=>p.x))-margin),y=Math.floor(Math.min(...points.map(p=>p.y))-margin);
    const width=Math.ceil((Math.max(...points.map(p=>p.x))+margin-x)/64)*64,height=Math.ceil((Math.max(...points.map(p=>p.y))+margin-y)/64)*64;
    const dpr=1.25;
    if(this.canvas.width!==Math.ceil(width*dpr)||this.canvas.height!==Math.ceil(height*dpr)){this.canvas.width=Math.ceil(width*dpr);this.canvas.height=Math.ceil(height*dpr);}
    const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.translate(-x,-y);
    const body=this.contour(points,distance,radius),head=points[0],tail=points.at(-1);
    const color=c.createLinearGradient(head.x,head.y,tail.x,tail.y);color.addColorStop(0,'rgba(135,122,255,.95)');color.addColorStop(.55,'rgba(95,77,255,.72)');color.addColorStop(1,'rgba(80,62,240,0)');
    c.lineJoin='round';c.lineCap='round';c.fillStyle='rgba(82,65,240,.13)';c.fill(body);
    c.strokeStyle=color;c.filter=`blur(${13/scale}px)`;c.lineWidth=24/scale;c.globalAlpha=.75;c.stroke(body);
    c.filter=`blur(${4/scale}px)`;c.lineWidth=11/scale;c.globalAlpha=.9;c.stroke(body);
    c.filter=`blur(${1.5/scale}px)`;c.lineWidth=3/scale;c.globalAlpha=.8;c.stroke(body);
    // Only the leading part is white; the long tail remains translucent violet.
    const coreLength=Math.min(112/scale,distance*.65),corePoints=[];
    for(const p of points){if(p.distance<coreLength)corePoints.push(p);else{const a=corePoints.at(-1)||head,t=(coreLength-a.distance)/(p.distance-a.distance||1);corePoints.push({x:a.x+(p.x-a.x)*t,y:a.y+(p.y-a.y)*t,distance:coreLength});break;}}
    if(corePoints.length>1){
      const core=this.contour(corePoints,coreLength,17/scale,true);
      c.fillStyle='#f5f7ff';c.globalAlpha=.35;c.filter=`blur(${7/scale}px)`;c.fill(core);
      c.globalAlpha=.98;c.filter=`blur(${1.2/scale}px)`;c.fill(core);
    }
    c.filter='none';c.globalAlpha=1;target.globalAlpha=opacity;target.drawImage(this.canvas,0,0,this.canvas.width,this.canvas.height,x,y,width,height);target.globalAlpha=1;
  }
  destroy(){this.canvas.width=this.canvas.height=1;}
}
