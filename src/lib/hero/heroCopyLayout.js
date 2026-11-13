export function layoutHeroCopy(artboard,viewport,headerInset){
  const copy=artboard.querySelector('.hero-intro-copy');
  const first=artboard.querySelector('.hero-title-line1');
  const last=artboard.querySelector('.hero-title-line2');
  if(!copy||!first||!last)return;
  const art=artboard.getBoundingClientRect(),view=viewport.getBoundingClientRect();
  const scale=art.width/artboard.offsetWidth;
  // Distribute the tiny difference between character slots. Both lines end
  // on the exact same coordinate without stretching the font or its height.
  const lines=[first,last];
  const widths=lines.map(line=>[...line.querySelectorAll('.hero-char-slot')].reduce((sum,slot)=>sum+slot.getBoundingClientRect().width/scale,0));
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
