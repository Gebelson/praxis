import { gsap } from 'gsap';
import { processSnapEase,processWheelTarget } from './processProgress.js';
import { isSectionNavigationActive,onSectionNavigationStart } from '../sectionNavigation.js';

// One wheel gesture per topic. Page scrolling remains native outside the list.
export function createProcessSnap({getTargets,getSmoother,getActiveIndex,getCardTarget=()=>getTargets().at(-1)}) {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let tween=null,smoother=null,snapping=false,target=null,targetIndex=null,startScroll=0;
  let lastWheel=-Infinity,lastDirection=0,destroyed=false,arrivalTimer=0,cardLatched=false,releasedDirection=0;
  const finish=()=>{if(target!==null&&Math.abs(target-getCardTarget())<2)cardLatched=true;snapping=false;tween=null;smoother=null;target=null;targetIndex=null;};
  function cancel(stop=true) {
    if(snapping){
      tween?.kill();
      if(stop)smoother?.scrollTo(smoother.actualScroll,{immediate:true});
      finish();
    }
  }
  function consume(event) {
    if(event.cancelable)event.preventDefault();
    // Lenis uses this flag to yield a wheel event already owned by a nested scroller.
    event.lenisStopPropagation=true;
  }
  function wheel(event) {
    if(isSectionNavigationActive()||destroyed||motion.matches||event.ctrlKey||!event.deltaY||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],.praxis-debug,[data-lenis-prevent]'))return;
    const targets=getTargets();if(!targets.length)return;
    const direction=Math.sign(event.deltaY),now=performance.now();
    const captureMargin=innerWidth<=1024?Math.min(180,innerHeight*.2):80;
    const inRange=scrollY>=targets[0]-captureMargin&&scrollY<=targets.at(-1)+captureMargin;
    if(!snapping&&!inRange)return;
    const sameGesture=direction===lastDirection&&now-lastWheel<180;
    if(sameGesture){
      // Consume only the tail of a gesture handled here; do not trap boundary exits.
      if(snapping||getActiveIndex()>0&&getActiveIndex()<targets.length-1){
        consume(event);lastWheel=now;return;
      }
    }
    const base=snapping?targetIndex:getActiveIndex();
    const next=processWheelTarget(scrollY,base,targets,direction);
    if(next===null){
      if(snapping){consume(event);lastWheel=now;return;}
      lastWheel=-Infinity;lastDirection=0;releasedDirection=direction;return;
    }
    consume(event);releasedDirection=0;
    lastWheel=now;lastDirection=direction;
    const lenis=getSmoother();
    const destination=Math.ceil(targets[next]),distance=destination-scrollY;
    const velocity=lenis?.isScrolling==='smooth'?lenis.velocity*60/Math.max(.1,gsap.ticker.deltaRatio(60)):0;
    cancel(false);
    target=destination;targetIndex=next;startScroll=scrollY;snapping=true;
    const cardTransition=next===targets.length-1||base===targets.length-1&&next===targets.length-2;
    const duration=innerWidth<=1024?(cardTransition?.42:.32):(cardTransition?.7:.42);
    const slope=Math.max(0,Math.min(2.5,velocity*duration/(distance||1)));
    const easing=t=>processSnapEase(t,slope);
    if(lenis){
      smoother=lenis;lenis.scrollTo(target,{duration,easing,lock:false,onComplete:finish});
    }else{
      const position={y:scrollY};
      tween=gsap.to(position,{y:target,duration,ease:easing,
        onUpdate:()=>window.scrollTo({top:position.y,behavior:'instant'}),onComplete:finish});
    }
  }
  let touch=null;
  function touchStart(event){
    interrupt();
    if(event.touches.length!==1){touch=null;return;}
    const point=event.touches[0];touch={x:point.clientX,y:point.clientY,handled:false,target:event.target};
  }
  function touchMove(event){
    if(!touch||event.touches.length!==1||innerWidth>1024)return;
    if(touch.handled){consume(event);return;}
    const point=event.touches[0],dy=touch.y-point.clientY,dx=touch.x-point.clientX;
    if(Math.abs(dy)<16||Math.abs(dx)>Math.abs(dy))return;
    wheel({deltaY:dy,deltaX:dx,ctrlKey:false,target:touch.target,cancelable:event.cancelable,
      preventDefault(){event.preventDefault();touch.handled=true;}});
  }
  function touchEnd(){touch=null;lastWheel=-Infinity;lastDirection=0;clearTimeout(arrivalTimer);arrivalTimer=setTimeout(settleCard,80);}
  function settleCard(){
    if(destroyed||innerWidth>1024||motion.matches||snapping||touch||isSectionNavigationActive())return;
    const targets=getTargets(),card=getCardTarget(),cardIndex=targets.findIndex(value=>Math.abs(value-card)<2);
    const candidates=cardIndex>=0?targets.slice(0,cardIndex+1):targets;
    if(!candidates.length)return;
    if(releasedDirection<0&&scrollY<=targets[0]+4||releasedDirection>0&&scrollY>=targets.at(-1)-4)return;
    const destination=candidates.reduce((best,y)=>Math.abs(y-scrollY)<Math.abs(best-scrollY)?y:best);
    const isCard=Math.abs(destination-card)<2;
    const distance=destination-scrollY,threshold=isCard?Math.min(180,innerHeight*.2):Math.min(260,innerHeight*.32);
    if(Math.abs(card-scrollY)>threshold*1.6)cardLatched=false;
    if(isCard&&cardLatched||Math.abs(distance)>threshold||Math.abs(distance)<2)return;
    if(isCard)cardLatched=true;
    target=Math.ceil(destination);targetIndex=targets.indexOf(destination);startScroll=scrollY;snapping=true;
    const position={y:scrollY};
    tween=gsap.to(position,{y:target,duration:.32,ease:t=>processSnapEase(t),
      onUpdate:()=>scrollTo({top:position.y,behavior:'instant'}),onComplete:finish});
  }
  function onScroll(){
    if(snapping&&(scrollY<Math.min(startScroll,target)-4||scrollY>Math.max(startScroll,target)+4))cancel();
    clearTimeout(arrivalTimer);arrivalTimer=setTimeout(settleCard,80);
  }
  const interrupt=()=>{clearTimeout(arrivalTimer);cancel(false);lastWheel=-Infinity;lastDirection=0;releasedDirection=0;};
  const detachNavigation=onSectionNavigationStart(()=>{cancel();lastWheel=-Infinity;lastDirection=0;});
  const passiveCapture={passive:true,capture:true};
  window.addEventListener('wheel',wheel,{passive:false,capture:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('pointerdown',interrupt,passiveCapture);
  window.addEventListener('touchstart',touchStart,passiveCapture);
  window.addEventListener('touchmove',touchMove,{passive:false,capture:true});
  window.addEventListener('touchend',touchEnd,passiveCapture);
  window.addEventListener('touchcancel',touchEnd,passiveCapture);
  window.addEventListener('keydown',interrupt,true);
  motion.addEventListener('change',cancel);
  return {cancel,getState:()=>({snapping,target}),destroy(){
    destroyed=true;clearTimeout(arrivalTimer);detachNavigation();cancel();
    window.removeEventListener('wheel',wheel,true);
    window.removeEventListener('scroll',onScroll);
    window.removeEventListener('pointerdown',interrupt,true);
    window.removeEventListener('touchstart',touchStart,true);
    window.removeEventListener('touchmove',touchMove,true);
    window.removeEventListener('touchend',touchEnd,true);
    window.removeEventListener('touchcancel',touchEnd,true);
    window.removeEventListener('keydown',interrupt,true);
    motion.removeEventListener('change',cancel);
  }};
}
