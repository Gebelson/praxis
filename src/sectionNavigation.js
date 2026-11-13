import { gsap } from 'gsap';

let navigationActive=false;
const START='praxis:section-navigation-start';
export const isSectionNavigationActive=()=>navigationActive;
export function onSectionNavigationStart(handler){window.addEventListener(START,handler);return ()=>window.removeEventListener(START,handler);}

export function initSectionNavigation(){
  if(window.PraxisSectionNavigation)return window.PraxisSectionNavigation;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let tween=null,smoother=null,generation=0,phase='idle',destination=null;
  const currentSmoother=()=>document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
  const targetFor=element=>{
    if(element.id==='inicio')return 0;
    const header=Math.max(0,document.querySelector('.site-header')?.getBoundingClientRect().bottom||0);
    return Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+element.getBoundingClientRect().top-header-12));
  };
  function cancel(){
    generation++;tween?.kill();tween=null;
    if(phase==='traveling'&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true,force:true});
    smoother=null;phase='idle';destination=null;navigationActive=false;
  }
  function navigate(element,hash){
    cancel();navigationActive=true;phase='traveling';destination=element;
    // Cancel every previous snap before this navigation takes ownership of Lenis.
    window.dispatchEvent(new Event(START));
    const version=++generation,y=targetFor(element);
    if(hash&&location.hash!==hash){history.pushState(null,'',hash);window.dispatchEvent(new Event('hashchange'));}
    const complete=()=>{
      if(version!==generation)return;
      phase='arrived';tween=null;
      // Keep snaps suspended at the destination until the next manual scroll.
      // Otherwise an adjacent snap can steal the final few pixels on arrival.
      const correction=targetFor(element);
      if(Math.abs(scrollY-correction)>2){
        const lenis=currentSmoother();if(lenis)lenis.scrollTo(correction,{immediate:true,force:true});else scrollTo({top:correction,behavior:'instant'});
      }
      smoother=null;
    };
    const easing=t=>t*t*t*(t*(6*t-15)+10),duration=motion.matches?0:Math.min(1.35,.65+Math.abs(y-scrollY)/18000);
    smoother=currentSmoother();
    if(smoother)smoother.scrollTo(y,{duration,easing,immediate:motion.matches,force:true,lock:false,onComplete:complete});
    else if(motion.matches){scrollTo({top:y,behavior:'instant'});complete();}
    else{const position={y:scrollY};tween=gsap.to(position,{y,duration,ease:easing,onUpdate:()=>scrollTo({top:position.y,behavior:'instant'}),onComplete:complete});}
  }
  function click(event){
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
    let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{return;}
    const element=document.getElementById(id);if(!element)return;
    event.preventDefault();navigate(element,url.hash);
  }
  function manual(event){
    if(event.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(event.type==='keydown'&&event.target.closest?.('input,textarea,select,[contenteditable],button'))return;
    if(navigationActive)cancel();
  }
  document.addEventListener('click',click,true);
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,manual,{passive:true,capture:true});
  const api={getState:()=>({active:navigationActive,phase,target:destination?.id||null,scrollTarget:destination?targetFor(destination):null}),destroy(){cancel();document.removeEventListener('click',click,true);for(const type of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(type,manual,true);delete window.PraxisSectionNavigation;}};
  window.PraxisSectionNavigation=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
