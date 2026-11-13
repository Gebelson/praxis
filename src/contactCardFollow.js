export function initContactCardFollow(root){
  const section=root.querySelector('.sec-contact'),card=section?.querySelector('.contact-info-card'),form=section?.querySelector('.contact-form-card');
  if(!card||!form)return ()=>{};
  const desktop=matchMedia('(min-width:1025px)');
  let frame=0,destroyed=false;
  function update(){
    frame=0;if(destroyed)return;
    if(!desktop.matches){card.style.removeProperty('transform');return;}
    const bounds=section.getBoundingClientRect(),scale=bounds.width/section.offsetWidth;
    const headerBottom=document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0;
    const naturalTop=bounds.top+card.offsetTop*scale;
    const limit=Math.max(0,form.offsetTop+form.offsetHeight-card.offsetTop-card.offsetHeight);
    const offset=Math.max(0,Math.min(limit,(headerBottom+38*scale-naturalTop)/scale));
    card.style.transform=offset?`translate3d(0,${offset}px,0)`:'';
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  const observer=new ResizeObserver(schedule);observer.observe(section);observer.observe(card);observer.observe(form);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('praxis:page-layout',schedule);desktop.addEventListener('change',schedule);schedule();
  return ()=>{destroyed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('praxis:page-layout',schedule);desktop.removeEventListener('change',schedule);card.style.removeProperty('transform');};
}
