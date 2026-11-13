export class FrameCanvas {
  constructor(host){
    this.canvas=document.createElement('canvas');this.canvas.className='praxis-frame-canvas';
    this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Monitor do Praxis: sequência fotográfica controlada pela rolagem, exibindo o showreel Word Films.');
    host.append(this.canvas);this.ctx=this.canvas.getContext('2d',{alpha:true});
  }
  resize(w,h){this.width=w;this.height=h;this.dpr=Math.min(window.devicePixelRatio||1,3);this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);}
  draw(image,layout,quad,debug){
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(image,layout.x,layout.y,1104*layout.scale,832*layout.scale);
    if(debug){c.beginPath();quad.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.strokeStyle='#f03055';c.lineWidth=1.5;c.stroke();quad.forEach(([x,y],i)=>{c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle='#a3ff12';c.fill();c.fillText(String(i),x+7,y-7);});}
  }
  destroy(){this.canvas.remove();}
}
