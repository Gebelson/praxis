// Keep the FAQ behind the incoming footer without changing document height.
export function initFooterCover(root) {
  const faq=root.querySelector('.sec-faq'),footer=root.querySelector('.site-footer');
  if(!faq||!footer)return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,destroyed=false;
  root.classList.add('has-footer-cover');
  function update(){
    frame=0;if(destroyed)return;
    if(reduced.matches){faq.style.removeProperty('transform');return;}
    const rect=footer.getBoundingClientRect();
    const scale=rect.width/(footer.offsetWidth||rect.width||1);
    const overlap=Math.max(0,Math.min(innerHeight-rect.top,rect.height));
    faq.style.transform=overlap?`translate3d(0,${overlap/scale}px,0)`:'';
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('praxis:page-layout',schedule);
  reduced.addEventListener('change',schedule);
  const observer=new ResizeObserver(schedule);observer.observe(footer);observer.observe(faq);
  schedule();
  return ()=>{
    destroyed=true;cancelAnimationFrame(frame);observer.disconnect();
    window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
    window.removeEventListener('praxis:page-layout',schedule);reduced.removeEventListener('change',schedule);
    faq.style.removeProperty('transform');root.classList.remove('has-footer-cover');
  };
}
