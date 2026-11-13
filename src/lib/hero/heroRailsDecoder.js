const SYMBOLS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/+';
export function initHeroRailsDecoder(host){
  const rails=[...host.querySelectorAll('.hero-rail')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,destroyed=false;
  const words=rails.flatMap(rail=>[...rail.querySelectorAll('.rail-word')].map(element=>{
    const text=element.textContent;const ghost=document.createElement('span'),glyph=document.createElement('span');
    ghost.className='rail-decode-ghost';ghost.textContent=text;glyph.className='rail-decode-glyph';glyph.textContent=text;
    element.replaceChildren(ghost,glyph);return {element,ghost,glyph,text};
  }));
  const dots=rails.flatMap(rail=>[...rail.querySelectorAll('.rail-dot')].map(element=>{
    const symbol=document.createElement('span');symbol.className='rail-dot-decode-symbol';element.append(symbol);
    return {element,symbol,originalOpacity:element.style.opacity,originalTransform:element.style.transform};
  }));
  const restore=()=>{words.forEach(w=>{w.glyph.textContent=w.text;w.glyph.style.visibility='';});dots.forEach(d=>{d.element.style.opacity=d.originalOpacity;d.element.style.transform=d.originalTransform;d.element.classList.remove('is-decoding');d.symbol.textContent='';});};
  const stop=()=>{cancelAnimationFrame(raf);raf=0;restore();host.dataset.railsDecode='completed';};
  const preference=()=>{if(motion.matches)stop();};
  const visibility=()=>{if(document.hidden)stop();};
  motion.addEventListener('change',preference);document.addEventListener('visibilitychange',visibility);
  document.fonts.ready.then(()=>{
    if(destroyed)return;
    if(motion.matches||document.hidden){stop();return;}
    const groups=rails.map(rail=>[...words.filter(w=>rail.contains(w.element)),...dots.filter(d=>rail.contains(d.element))].sort((a,b)=>a.element.getBoundingClientRect().top-b.element.getBoundingClientRect().top));
    groups.forEach(group=>group.forEach((w,i)=>{w.order=i/Math.max(1,group.length-1);if(w.glyph)w.glyph.style.visibility='hidden';else{w.element.style.opacity='0';w.element.style.transform='scale(0)';}}));
    host.dataset.railsDecode='entering';const began=performance.now();let last=0;
    const tick=now=>{
      raf=0;if(destroyed)return;
      const p=Math.min(1,(now-began)/1800);
      if(now-last>=50||p===1){
        last=now;
        groups.forEach(group=>group.forEach(w=>{
          const local=(p-w.order*.7)/.3;
          if(!w.glyph){
            const active=local>=0&&local<1;
            w.element.classList.toggle('is-decoding',active);
            w.element.style.opacity=local<0?'0':'1';w.element.style.transform=w.originalTransform;
            w.symbol.textContent=active?'#%+×01/□'[Math.floor(Math.random()*8)]:'';
            return;
          }
          w.glyph.style.visibility=local<0?'hidden':'';
          w.glyph.textContent=local>=1?w.text:Array.from(w.text,(ch,i)=>i/w.text.length<local?ch:SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]).join('');
        }));
      }
      if(p<1)raf=requestAnimationFrame(tick);else stop();
    };
    raf=requestAnimationFrame(tick);
  });
  return ()=>{destroyed=true;stop();motion.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility);words.forEach(w=>{w.element.textContent=w.text;});dots.forEach(d=>d.symbol.remove());delete host.dataset.railsDecode;};
}
