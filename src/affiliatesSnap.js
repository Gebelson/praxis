import { gsap } from 'gsap';
import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';

export function initAffiliatesSnap() {
  const section=document.querySelector('.sec-affiliates'),intro=section?.querySelector('.affiliates-top');
  if(!intro)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const header=document.querySelector('.site-header'),ease=t=>t*t*t*(t*(6*t-15)+10);
  let frame=0,tween=null,smoother=null,running=false,latched=false,destroyed=false;
  const detachNavigation=onSectionNavigationStart(()=>{cancel();latched=true;});
  function bounds(){
    const headerBottom=Math.max(0,header?.getBoundingClientRect().bottom||0),r=intro.getBoundingClientRect();
    return {r,available:innerHeight-headerBottom,center:headerBottom+(innerHeight-headerBottom)/2};
  }
  function layout(){
    const {available}=bounds(),ratio=section.getBoundingClientRect().width/section.offsetWidth||1;
    // The mobile section already has equal outer padding; subtract it from this inner block.
    const css=getComputedStyle(section),padding=innerWidth<=1024?parseFloat(css.paddingTop)+parseFloat(css.paddingBottom):0;
    section.style.setProperty('--aff-viewport-height',`${Math.max(0,available/ratio-padding)}px`);
    window.dispatchEvent(new Event('praxis:page-layout'));
  }
  function cancel(){
    if(running&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true});
    tween?.kill();tween=null;smoother=null;running=false;
  }
  function update(){
    frame=0;if(isSectionNavigationActive()){latched=true;return;}if(destroyed||running||reduced.matches)return;
    const {r,available,center}=bounds();
    if(r.height>available+2)return;
    const distance=r.top+r.height/2-center,threshold=Math.min(120,Math.max(60,innerHeight*.1));
    if(Math.abs(distance)>threshold*1.8)latched=false;
    if(latched||Math.abs(distance)>threshold)return;
    latched=true;
    if(Math.abs(distance)<2){intro.dataset.snap='settled';return;}
    running=true;intro.dataset.snap='snapping';
    const target=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+distance));
    const complete=()=>{running=false;tween=null;smoother=null;intro.dataset.snap='settled';};
    smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother)smoother.scrollTo(target,{duration:.55,easing:ease,lock:false,onComplete:complete});
    else{const state={y:scrollY};tween=gsap.to(state,{y:target,duration:.55,ease,onUpdate:()=>scrollTo({top:state.y,behavior:'instant'}),onComplete:complete});}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function interrupt(event){
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(running){cancel();latched=true;intro.dataset.snap='interrupted';}
  }
  function resize(){cancel();layout();latched=false;schedule();}
  const observer=new ResizeObserver(resize);if(header)observer.observe(header);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,interrupt,{passive:true,capture:true});
  reduced.addEventListener('change',resize);document.fonts.ready.then(()=>{if(!destroyed)resize();});resize();
  return {destroy(){
    destroyed=true;detachNavigation();cancel();cancelAnimationFrame(frame);observer.disconnect();
    window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);
    for(const type of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(type,interrupt,true);
    reduced.removeEventListener('change',resize);section.style.removeProperty('--aff-viewport-height');delete intro.dataset.snap;
  }};
}
