import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { isSectionNavigationActive,onSectionNavigationStart } from '../../sectionNavigation.js';
gsap.registerPlugin(ScrollTrigger);
export function createScrollController(section,viewport,onProgress,onScroll) {
  let smoother,tick,gestureTimer,gestureDirection=0,travelDirection=0,traveling=false;
  const endGesture=()=>{gestureDirection=0;};
  const detachNavigation=onSectionNavigationStart(()=>{traveling=false;gestureDirection=0;travelDirection=0;clearTimeout(gestureTimer);});
  const wheel=event=>{
    if(isSectionNavigationActive())return;
    if(event.ctrlKey||Math.abs(event.deltaY)<=Math.abs(event.deltaX)||event.target.closest?.('input,textarea,select,[contenteditable],.praxis-debug'))return;
    const direction=Math.sign(event.deltaY),y=smoother?.scroll??window.scrollY;
    const inside=y>=trigger.start-1&&y<=trigger.end+1;
    const sameGesture=gestureDirection===direction;
    const canTravel=direction>0?y<trigger.end-1:y>trigger.start+1;
    if(!inside||(!traveling&&!sameGesture&&!canTravel))return;
    event.preventDefault();event.stopImmediatePropagation();
    clearTimeout(gestureTimer);gestureTimer=setTimeout(endGesture,180);
    if(sameGesture||(traveling&&travelDirection===direction))return;
    gestureDirection=direction;travelDirection=direction;traveling=true;
    smoother.scrollTo(direction>0?trigger.end:trigger.start,{
      force:true,duration:1.15,lerp:undefined,
      easing:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
      onComplete:()=>{traveling=false;}
    });
  };
  const trigger=ScrollTrigger.create({id:'praxis-frame-hero',trigger:section,start:'top top',end:()=>`+=${Math.round(innerHeight*2)}`,
    pin:viewport,pinSpacing:true,invalidateOnRefresh:true,anticipatePin:0,
    onUpdate:self=>{onProgress(self.progress);if(onScroll)onScroll(self);},
    onRefresh:self=>{onProgress(self.progress);if(onScroll)onScroll(self);},
    onKill:()=>{detachNavigation();window.removeEventListener('wheel',wheel,true);clearTimeout(gestureTimer);if(tick)gsap.ticker.remove(tick);smoother?.destroy();}});
  // Smooth the actual page scroll. A shorter Hero settling time reduces input
  // latency; the rest of the page retains the reference's 1.2s wheel duration.
  smoother=new Lenis({lerp:0.1,duration:0.65,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),
    smoothWheel:true,syncTouch:false,anchors:false,
    prevent:node=>node.classList?.contains('praxis-debug'),
    virtualScroll:({event})=>{smoother.options.wheelMultiplier=event.deltaMode===1?2:1;return true;}});
  smoother.on('scroll',e=>{ScrollTrigger.update();smoother.options.duration=trigger.isActive?0.65:1.2;if(onScroll)onScroll(trigger,e);});
  tick=time=>smoother.raf(time*1000);gsap.ticker.add(tick);
  window.addEventListener('wheel',wheel,{capture:true,passive:false});
  trigger.smoother=smoother;
  return trigger;
}
