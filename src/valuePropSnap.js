import { gsap } from 'gsap';
import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';

export function initValuePropSnap(){
  const section=document.querySelector('.sec-value-prop'),portrait=section?.querySelector('.sec2-right-portrait');
  if(!section||!portrait||section.valuePropSnap)return section?.valuePropSnap;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,tween=null,smoother=null,running=false,latched=false,destroyed=false;
  const detachNavigation=onSectionNavigationStart(()=>{cancel();latched=true;});
  function target(){
    if(innerWidth<=1024)return null;
    const header=Math.max(0,document.querySelector('.site-header')?.getBoundingClientRect().bottom||0);
    const r=portrait.getBoundingClientRect(),available=innerHeight-header;
    // Center the photo/content composition below the header, excluding the
    // metadata divider above it. Tall viewports get balanced free space.
    const top=header+Math.max(16,(available-r.height)/2);
    return Math.max(0,scrollY+r.top-top);
  }
  function cancel(){
    if(running&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true});
    tween?.kill();tween=null;smoother=null;running=false;
  }
  function update(){
    frame=0;if(isSectionNavigationActive()){latched=true;return;}if(destroyed||running||motion.matches)return;
    const y=target();if(y===null)return;
    const distance=y-scrollY,threshold=Math.min(120,Math.max(60,innerHeight*.1));
    if(Math.abs(distance)>threshold*1.8)latched=false;
    if(latched||Math.abs(distance)>threshold)return;
    latched=true;
    if(Math.abs(distance)<1){section.dataset.snap='settled';return;}
    running=true;section.dataset.snap='snapping';
    const complete=()=>{running=false;tween=null;smoother=null;section.dataset.snap='settled';};
    const easing=t=>t*t*t*(t*(6*t-15)+10);
    smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother)smoother.scrollTo(y,{duration:.65,easing,lock:false,onComplete:complete});
    else{const value={y:scrollY};tween=gsap.to(value,{y,duration:.65,ease:easing,onUpdate:()=>scrollTo({top:value.y,behavior:'instant'}),onComplete:complete});}
  }
  const schedule=()=>{if(!frame&&!destroyed)frame=requestAnimationFrame(update);};
  function interrupt(event){
    if(event.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(running){cancel();latched=true;section.dataset.snap='interrupted';}
  }
  const resize=()=>{cancel();latched=false;schedule();};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,interrupt,{capture:true,passive:true});
  motion.addEventListener('change',resize);document.fonts.ready.then(schedule);schedule();
  const api={getState:()=>({target:target(),running,latched}),destroy(){destroyed=true;detachNavigation();cancel();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);for(const type of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(type,interrupt,true);motion.removeEventListener('change',resize);delete section.dataset.snap;delete section.valuePropSnap;}};
  section.valuePropSnap=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
