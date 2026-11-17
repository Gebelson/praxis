export function layoutHeroCopy(artboard,viewport,headerInset,screen=null,viewportHeight=window.innerHeight){
  const copy=artboard.querySelector('.hero-intro-copy');
  const first=artboard.querySelector('.hero-title-line1');
  const last=artboard.querySelector('.hero-title-line2');
  if(!copy||!first||!last)return;
  const mobile=artboard.offsetWidth<=1024;
  const cjk=document.documentElement.lang.startsWith('zh');
  for(const line of [first,last]){for(const property of ['position','left','top'])line.style.removeProperty(property);}
  const lines=[first,last],reference=['PROCURANDO UM SITE','DE VERDADE?'];
  // Locale changes affect horizontal fitting only. Cap-height and line positions
  // follow the Portuguese composition at the same viewport size.
  for(const line of lines){line.style.removeProperty('font-size');line.style.removeProperty('scale');line.style.removeProperty('translate');}
  if(mobile){
    first.parentElement.style.top=`${headerInset+24}px`;
    // Fit translated lines from a shared origin, not their unscaled flex centre.
    for(const line of lines){line.style.position='absolute';line.style.left='24px';}
    first.style.top='0px';
  }
  else first.parentElement.style.removeProperty('top');
  const art=artboard.getBoundingClientRect(),view=viewport.getBoundingClientRect();
  const scale=art.width/artboard.offsetWidth,ctx=document.createElement('canvas').getContext('2d');
  const target=mobile?Math.min(artboard.offsetWidth-48,720):944;
  const mobileHeight=viewportHeight;
  for(const [index,line] of lines.entries()){
    if(mobile||cjk){
      const style=getComputedStyle(line);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const spacing=parseFloat(style.letterSpacing)||0;
      const sizingText=cjk?[...line.querySelectorAll('[data-char]')].map(slot=>slot.dataset.char).join(''):reference[index];
      const referenceWidth=[...sizingText].reduce((sum,char)=>sum+ctx.measureText(char).width+spacing,0);
      line.style.fontSize=`${parseFloat(style.fontSize)*target/referenceWidth}px`;
    }
    const slots=[...line.querySelectorAll('.hero-char-slot')];
    const advances=slots.map(slot=>slot.getBoundingClientRect().width/scale);
    const natural=advances.reduce((sum,width)=>sum+width,0);
    const translated=document.documentElement.lang!=='pt-BR';
    line.style.display='flex';line.style.justifyContent='space-between';line.style.alignItems='baseline';
    line.style.width=`${translated?natural:target}px`;
    line.style.transformOrigin='0 0';
    if(translated&&natural>0)line.style.scale=`${target/natural} 1`;
    if(cjk&&natural>0){
      // Full-width punctuation includes blank side bearings. Match visible ink,
      // not the advance boxes, so both lines share the same visual endpoints.
      const style=getComputedStyle(line);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const inkLeft=-ctx.measureText(slots[0].dataset.char).actualBoundingBoxLeft;
      const inkRight=natural-advances.at(-1)+ctx.measureText(slots.at(-1).dataset.char).actualBoundingBoxRight;
      const horizontalScale=target/(inkRight-inkLeft);
      line.style.scale=`${horizontalScale} 1`;
      line.style.translate=`${-inkLeft*horizontalScale}px 0`;
    }
    for(const slot of slots)slot.style.flex='0 0 auto';
  }
  const inkBounds=element=>{
    const s=getComputedStyle(element),r=element.getBoundingClientRect();ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    // Decoder glyphs are transient (and some font symbols have extreme bounds).
    // All title lines share this stable uppercase cap-height, in every phase.
    const stableText=cjk?[...element.querySelectorAll('[data-char]')].map(slot=>slot.dataset.char).join(''):'H';
    const m=ctx.measureText(stableText),line=parseFloat(s.lineHeight);
    const baseline=(line-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent;
    return {top:r.top+(baseline-m.actualBoundingBoxAscent)*scale,bottom:r.top+(baseline+m.actualBoundingBoxDescent)*scale};
  };
  // In Pemage the inverted question mark descends below the baseline. Fit its
  // actual ink to the cap-height, rather than aligning its font box to letters.
  for(const line of lines){
    const s=getComputedStyle(line);ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const cap=ctx.measureText('H'),mark=ctx.measureText('¿');
    const ratio=(cap.actualBoundingBoxAscent+cap.actualBoundingBoxDescent)/(mark.actualBoundingBoxAscent+mark.actualBoundingBoxDescent);
    const baseline=(parseFloat(s.lineHeight)-cap.fontBoundingBoxAscent-cap.fontBoundingBoxDescent)/2+cap.fontBoundingBoxAscent;
    const shift=baseline+(cap.actualBoundingBoxDescent-cap.actualBoundingBoxAscent)/2-ratio*(baseline+(mark.actualBoundingBoxDescent-mark.actualBoundingBoxAscent)/2);
    for(const glyph of line.querySelectorAll('[data-char="¿"] .hero-char-glyph,[data-char="¿"] .hero-char-ghost')){
      if(glyph.classList.contains('hero-char-ghost'))glyph.style.display='inline-block';
      glyph.style.transformOrigin='50% 0';glyph.style.transform=`translateY(${shift}px) scale(${ratio})`;
    }
  }
  if(mobile)last.style.top=`${first.offsetHeight}px`;
  const upper=inkBounds(first);let lower=inkBounds(last);
  if(cjk){
    const parentTop=first.parentElement.getBoundingClientRect().top;
    const inkOffset=lower.top-last.getBoundingClientRect().top;
    last.style.top=`${(upper.bottom-parentTop-inkOffset)/scale+6}px`;
    lower=inkBounds(last);
  }
  if(mobile){
    const width=artboard.offsetWidth;
    // The mobile reference frames the monitor, not the empty source-image area.
    // Uniform scaling retains the photographed perspective; the same layout is
    // consumed by the canvas, ASCII overlay and projected video.
    const points=Object.values(screen),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys);
    const monitorTop=(lower.bottom-art.top)/scale+30;
    const frameScale=Math.min(width*.86/(right-left+28),Math.max(1,mobileHeight-monitorTop)/(832-top+14));
    const frameX=width/2-(left+right)/2*frameScale;
    copy.style.left=`${Math.max(24,(width-680)/2)}px`;
    copy.style.width=`${Math.min(width-48,680)}px`;copy.style.fontSize=width<600?'10px':'11px';
    const copyTop=(lower.bottom-art.top)/scale+5;copy.style.top=`${copyTop}px`;
    const frameY=mobileHeight+2-832*frameScale;
    return {height:mobileHeight,frame:{scale:frameScale,x:frameX,y:frameY}};
  }
  const gap=Math.max(16,upper.top-view.top-headerInset);
  copy.style.left=`${(first.getBoundingClientRect().left-art.left)/scale}px`;
  copy.style.width=`${first.getBoundingClientRect().width/scale}px`;
  copy.style.fontSize=artboard.offsetWidth<=1024?'10px':'11px';
  const bottom=view.bottom-gap;
  const available=(bottom-lower.bottom-16)/scale;
  // Preserve small readable type; the desktop copy fills the space below the title.
  const referenceCopy=copy.cloneNode(false);
  referenceCopy.textContent=copy.dataset.referenceText||copy.textContent;
  referenceCopy.style.visibility='hidden';referenceCopy.removeAttribute('id');artboard.append(referenceCopy);
  const referenceHeight=referenceCopy.offsetHeight;referenceCopy.remove();
  if(available>0&&referenceHeight>available){
    copy.style.fontSize=`${Math.max(9,parseFloat(copy.style.fontSize)*available/referenceHeight)}px`;
  }
  copy.style.top=`${(lower.bottom-art.top)/scale+5}px`;
}
