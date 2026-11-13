export function initBudgetLogoMotion(section){
  const layer=section?.querySelector('.budget-logo-motion');
  if(!layer)return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,x=0,y=0,targetX=0,targetY=0,last=0,rect;
  const render=time=>{
    raf=0;
    const dt=last?Math.min(64,time-last):16.7;last=time;
    const ease=1-Math.exp(-dt/95);
    x+=(targetX-x)*ease;y+=(targetY-y)*ease;
    if(Math.abs(targetX-x)+Math.abs(targetY-y)<.001){x=targetX;y=targetY;}
    layer.style.transform=`perspective(1400px) translate3d(${x*20}px,${y*14}px,0) rotateX(${-y*4}deg) rotateY(${x*5}deg) rotateZ(${x*.6}deg)`;
    if(x!==targetX||y!==targetY)raf=requestAnimationFrame(render);else last=0;
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(render);};
  const enter=()=>{rect=section.getBoundingClientRect();};
  const move=event=>{
    if(reduced.matches||event.pointerType==='touch')return;
    rect??=section.getBoundingClientRect();
    targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
    targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));schedule();
  };
  const reset=()=>{targetX=targetY=0;schedule();};
  const preference=()=>{cancelAnimationFrame(raf);raf=0;x=y=targetX=targetY=last=0;layer.style.transform='none';};
  const invalidate=()=>{rect=section.getBoundingClientRect();};
  section.addEventListener('pointerenter',enter);section.addEventListener('pointermove',move);section.addEventListener('pointerleave',reset);
  window.addEventListener('scroll',invalidate,{passive:true});window.addEventListener('resize',invalidate);reduced.addEventListener('change',preference);
  return ()=>{cancelAnimationFrame(raf);section.removeEventListener('pointerenter',enter);section.removeEventListener('pointermove',move);section.removeEventListener('pointerleave',reset);window.removeEventListener('scroll',invalidate);window.removeEventListener('resize',invalidate);reduced.removeEventListener('change',preference);layer.style.transform='';};
}
