import { gsap } from 'gsap';
import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';

export function initFooterSnap(root){
  const footer=root.querySelector('.site-footer');if(!footer)return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const easing=t=>t*t*t*(t*(6*t-15)+10);
  let running=false,direction=0,tween=null,smoother=null;
  function cancel(){
    if(running&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true});
    tween?.kill();running=false;tween=null;smoother=null;
  }
  const detachNavigation=onSectionNavigationStart(cancel);
  function wheel(event){
    if(isSectionNavigationActive()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
    if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    const requestedDirection=Math.sign(event.deltaY);
    if(running){if(requestedDirection===direction){event.preventDefault();event.stopPropagation();return;}cancel();}
    const rect=footer.getBoundingClientRect(),header=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
    const end=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    // Reveal the entire footer when it fits; otherwise land at its beginning.
    const footerTarget=Math.min(end,Math.max(0,scrollY+rect.top-header));
    const faqTarget=Math.max(0,scrollY+rect.top-innerHeight);
    const target=requestedDirection>0?footerTarget:faqTarget;
    if(requestedDirection>0){
      if(rect.top>innerHeight+64||rect.top<header||target-scrollY<3)return;
    }else{
      // Tall footers remain readable: capture only near their beginning.
      if(scrollY>footerTarget+64||scrollY-target<3)return;
    }
    event.preventDefault();event.stopPropagation();
    if(reduced.matches){scrollTo({top:target,behavior:'instant'});return;}
    running=true;direction=requestedDirection;
    const complete=()=>{running=false;tween=null;smoother=null;};
    smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother)smoother.scrollTo(target,{duration:.85,easing,lock:false,onComplete:complete});
    else{const state={y:scrollY};tween=gsap.to(state,{y:target,duration:.85,ease:easing,onUpdate:()=>scrollTo({top:state.y,behavior:'instant'}),onComplete:complete});}
  }
  window.addEventListener('wheel',wheel,{passive:false,capture:true});
  window.addEventListener('resize',cancel);window.addEventListener('touchstart',cancel,{passive:true});window.addEventListener('pointerdown',cancel,{passive:true});
  return ()=>{cancel();detachNavigation();window.removeEventListener('wheel',wheel,true);window.removeEventListener('resize',cancel);window.removeEventListener('touchstart',cancel);window.removeEventListener('pointerdown',cancel);};
}
