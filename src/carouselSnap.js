import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';
export function initCarouselSnap(container) {
  if(container.carouselSnap)return container.carouselSnap;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const duration=340,ease=t=>t*t*t*(t*(6*t-15)+10);
  let timer=0,frame=0,running=false,latched=false,destroyed=false,smoother=null,generation=0;
  const detachNavigation=onSectionNavigationStart(()=>{stop();latched=true;});
  function target(){
    const slide=container.querySelector('.carousel-slide.is-active');if(!slide)return null;
    const r=slide.getBoundingClientRect(),headerBottom=Math.max(0,document.querySelector('header')?.getBoundingClientRect().bottom||0);
    const scale=innerWidth>1024?document.documentElement.clientWidth/1440:1;
    return {distance:r.top-headerBottom-14*scale,visible:r.bottom>headerBottom&&r.top<innerHeight,threshold:Math.min(140,Math.max(60,innerHeight*.12))};
  }
  function state(value){container.dataset.carouselSnap=value;if(value==='settled')container.dispatchEvent(new CustomEvent('carousel:snap-settled'));}
  function stop(){
    generation++;clearTimeout(timer);timer=0;cancelAnimationFrame(frame);frame=0;
    if(running&&smoother)smoother.scrollTo(smoother.scroll,{immediate:true});running=false;smoother=null;
  }
  function interrupt(event){
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    const wasRunning=running;stop();if(wasRunning){latched=true;state('interrupted');}
  }
  function settle(){
    timer=0;if(isSectionNavigationActive()){latched=true;return;}if(destroyed||running||container.querySelector('.is-dragging'))return;
    const t=target();if(!t||!t.visible)return;
    if(motion.matches){if(!latched&&Math.abs(t.distance)<2){latched=true;state('settled');}return;}
    if(Math.abs(t.distance)>t.threshold*1.8)latched=false;
    if(latched||Math.abs(t.distance)>t.threshold)return;
    latched=true;if(Math.abs(t.distance)<2){state('settled');return;}
    const to=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+t.distance)),version=++generation;
    running=true;state('snapping');
    const complete=()=>{
      if(version!==generation||destroyed)return;running=false;smoother=null;
      const actual=target();
      if(actual&&Math.abs(actual.distance)>2){latched=false;state('idle');scroll();return;}
      state('settled');
    };
    smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother){smoother.scrollTo(to,{duration:duration/1000,lock:false,easing:ease,onComplete:complete});return;}
    const from=scrollY,start=performance.now();
    function tick(now){
      frame=0;if(version!==generation||destroyed)return;const p=Math.max(0,Math.min(1,(now-start)/duration));
      window.scrollTo({top:from+(to-from)*ease(p),behavior:'instant'});
      if(p<1)frame=requestAnimationFrame(tick);else complete();
    }
    frame=requestAnimationFrame(tick);
  }
  function scroll(){
    if(isSectionNavigationActive()){latched=true;return;}
    if(destroyed||running)return;
    const t=target();if(t&&Math.abs(t.distance)>t.threshold*1.8){if(latched)state(motion.matches?'disabled':'idle');latched=false;}
    clearTimeout(timer);timer=setTimeout(settle,t?.visible&&!latched&&Math.abs(t.distance)<=t.threshold?0:45);
  }
  function preference(){stop();latched=false;state(motion.matches?'disabled':'idle');}
  window.addEventListener('scroll',scroll,{passive:true});
  for(const type of ['wheel','touchstart','touchmove','pointerdown','keydown'])window.addEventListener(type,interrupt,{passive:true,capture:true});
  window.addEventListener('resize',preference,{passive:true});motion.addEventListener('change',preference);
  const api={destroy(){
    destroyed=true;detachNavigation();stop();window.removeEventListener('scroll',scroll);
    for(const type of ['wheel','touchstart','touchmove','pointerdown','keydown'])window.removeEventListener(type,interrupt,true);
    window.removeEventListener('resize',preference);motion.removeEventListener('change',preference);delete container.carouselSnap;delete container.dataset.carouselSnap;
  }};
  container.carouselSnap=api;state(motion.matches?'disabled':'idle');import.meta.hot?.dispose(()=>api.destroy());return api;
}
