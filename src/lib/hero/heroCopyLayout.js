export function layoutHeroCopy(artboard,viewport,headerInset,screen=null){
  const copy=artboard.querySelector('.hero-intro-copy');
  const first=artboard.querySelector('.hero-title-line1');
  const last=artboard.querySelector('.hero-title-line2');
  if(!copy||!first||!last)return;
  const mobile=artboard.offsetWidth<=1024;
  if(!mobile){first.style.removeProperty('font-size');last.style.removeProperty('font-size');first.parentElement.style.removeProperty('top');}
  const art=artboard.getBoundingClientRect(),view=viewport.getBoundingClientRect();
  const scale=art.width/artboard.offsetWidth;
  // Distribute the tiny difference between character slots. Both lines end
  // on the exact same coordinate without stretching the font or its height.
  const lines=[first,last];
  let widths=lines.map(line=>[...line.querySelectorAll('.hero-char-slot')].reduce((sum,slot)=>sum+slot.getBoundingClientRect().width/scale,0));
  if(mobile){
    const target=Math.min(artboard.offsetWidth-48,720);
    lines.forEach((line,index)=>{if(widths[index]>0)line.style.fontSize=`${parseFloat(getComputedStyle(line).fontSize)*target/widths[index]}px`;});
    widths=[target,target];first.parentElement.style.top=`${headerInset+24}px`;
  }
  const titleWidth=Math.max(...widths);
  for(const line of lines){
    line.style.display='flex';line.style.justifyContent='space-between';line.style.alignItems='baseline';
    line.style.width=`${titleWidth}px`;
    for(const slot of line.querySelectorAll('.hero-char-slot'))slot.style.flex='0 0 auto';
  }
  const ctx=document.createElement('canvas').getContext('2d');
  const inkBounds=element=>{
    const s=getComputedStyle(element),r=element.getBoundingClientRect();ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m=ctx.measureText(element.textContent),line=parseFloat(s.lineHeight);
    const baseline=(line-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent;
    return {top:r.top+(baseline-m.actualBoundingBoxAscent)*scale,bottom:r.top+(baseline+m.actualBoundingBoxDescent)*scale};
  };
  const upper=inkBounds(first),lower=inkBounds(last);
  if(mobile){
    const width=artboard.offsetWidth;
    // The mobile reference frames the monitor, not the empty source-image area.
    // Uniform scaling retains the photographed perspective; the same layout is
    // consumed by the canvas, ASCII overlay and projected video.
    const points=Object.values(screen),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys);
    const frameScale=width*.86/(right-left+28);
    const frameX=width/2-(left+right)/2*frameScale;
    const monitorTop=(lower.bottom-art.top)/scale+30;
    const frameY=monitorTop-(top-14)*frameScale;
    copy.style.left=`${Math.max(24,(width-680)/2)}px`;
    copy.style.width=`${Math.min(width-48,680)}px`;copy.style.fontSize=width<600?'16px':'17px';
    const copyTop=frameY+832*frameScale+32;copy.style.top=`${copyTop}px`;
    return {height:Math.max(innerHeight,Math.ceil(copyTop+copy.offsetHeight+48)),frame:{scale:frameScale,x:frameX,y:frameY}};
  }
  const gap=Math.max(16,upper.top-view.top-headerInset);
  copy.style.left=`${(first.getBoundingClientRect().left-art.left)/scale}px`;
  copy.style.width=`${first.getBoundingClientRect().width/scale}px`;
  copy.style.fontSize=artboard.offsetWidth<=1024?'10px':'11px';
  const bottom=view.bottom-gap;
  const available=(bottom-lower.bottom-16)/scale;
  // Preserve small readable type; the desktop copy fills the space below the title.
  if(available>0&&copy.offsetHeight>available){
    copy.style.fontSize=`${Math.max(9,parseFloat(copy.style.fontSize)*available/copy.offsetHeight)}px`;
  }
  copy.style.top=`${(lower.bottom-art.top)/scale+5}px`;
}
