import { gsap } from 'gsap';
import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';

export function devmodeSnapTarget() {
  const section=document.querySelector('.sec-devmode');
  // A tall stacked layout must remain freely readable rather than skipping content.
  if(!section||innerWidth<=1024)return null;
  const headerBottom=Math.max(0,document.querySelector('header')?.getBoundingClientRect().bottom||0);
  return Math.max(0,scrollY+section.getBoundingClientRect().top-headerBottom);
}

export function initDevmodeSnap(isBusy=()=>false) {
  const section=document.querySelector('.sec-devmode');if(!section)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const easing=t=>t*t*t*(t*(6*t-15)+10);
  let frame=0,tween=null,smoother=null,running=false,latched=false,destroyed=false;
  const detachNavigation=onSectionNavigationStart(()=>{cancel();latched=true;});
  function cancel(){
    if(running&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true});
    tween?.kill();tween=null;smoother=null;running=false;
  }
  function update(){
    frame=0;if(isSectionNavigationActive()){latched=true;return;}if(destroyed||running||isBusy()||reduced.matches)return;
    const target=devmodeSnapTarget();if(target===null)return;
    const distance=target-scrollY,threshold=Math.min(120,Math.max(60,innerHeight*.1));
    if(Math.abs(distance)>threshold*1.8)latched=false;
    if(latched||Math.abs(distance)>threshold)return;
    latched=true;
    if(Math.abs(distance)<2){section.dataset.snap='settled';return;}
    running=true;section.dataset.snap='snapping';
    const complete=()=>{running=false;smoother=null;tween=null;section.dataset.snap='settled';};
    smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother)smoother.scrollTo(Math.ceil(target),{duration:.55,easing,lock:false,onComplete:complete});
    else{
      const state={y:scrollY};tween=gsap.to(state,{y:Math.ceil(target),duration:.55,ease:easing,
        onUpdate:()=>scrollTo({top:state.y,behavior:'instant'}),onComplete:complete});
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function interrupt(event){
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(running){cancel();latched=true;section.dataset.snap='interrupted';}
  }
  function resize(){cancel();latched=false;schedule();}
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,interrupt,{passive:true,capture:true});
  reduced.addEventListener('change',resize);schedule();
  return {destroy(){
    destroyed=true;detachNavigation();cancel();cancelAnimationFrame(frame);
    window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);
    for(const type of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(type,interrupt,true);
    reduced.removeEventListener('change',resize);delete section.dataset.snap;
  }};
}
