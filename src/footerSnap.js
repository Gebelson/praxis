import { gsap } from 'gsap';
import { isSectionNavigationActive,onSectionNavigationStart } from './sectionNavigation.js';

export function initFooterSnap(root){
  const footer=root.querySelector('.site-footer');if(!footer)return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const easing=t=>t*t*t*(t*(6*t-15)+10);
  let running=false,direction=0,tween=null,smoother=null,touch=null,timer=0,destroyed=false,latched=false,lastWidth=innerWidth,lastWheel=-Infinity;
  const editable=target=>target?.closest?.('input,textarea,select,[contenteditable="true"],[data-lenis-prevent]');
  function bounds(){
    const rect=footer.getBoundingClientRect(),header=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
    const end=Math.max(0,document.documentElement.scrollHeight-innerHeight),documentTop=scrollY+rect.top;
    return {rect,header,footerTarget:Math.min(end,Math.max(0,documentTop-header)),faqTarget:Math.max(0,documentTop-innerHeight-1)};
  }
  function cancel(){
    clearTimeout(timer);timer=0;
    if(running&&smoother)smoother.scrollTo(smoother.actualScroll,{immediate:true});
    if(running)footer.dataset.snap='idle';
    tween?.kill();running=false;tween=null;smoother=null;
  }
  const detachNavigation=onSectionNavigationStart(()=>{cancel();latched=true;});
  function travel(requestedDirection){
    cancel();direction=requestedDirection;latched=true;
    const destination=()=>{const b=bounds();return direction>0?b.footerTarget:b.faqTarget;};
    if(reduced.matches){scrollTo({top:destination(),behavior:'instant'});footer.dataset.snap='settled';return;}
    running=true;footer.dataset.snap='snapping';
    const start=scrollY,clock={progress:0};
    const complete=()=>{running=false;tween=null;smoother=null;footer.dataset.snap='settled';};
    if(innerWidth>1024){smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(smoother){smoother.scrollTo(destination(),{duration:.85,easing,lock:false,onComplete:complete});return;}}
    // Re-evaluate the endpoint when mobile browser chrome changes viewport height.
    // A height-only resize must not cancel a gesture halfway through the reveal.
    tween=gsap.to(clock,{progress:1,duration:innerWidth<=1024?.46:.85,ease:'none',
      onUpdate:()=>scrollTo({top:start+(destination()-start)*easing(clock.progress),behavior:'instant'}),onComplete:complete});
  }
  function consume(event){if(event.cancelable)event.preventDefault();event.stopPropagation?.();event.lenisStopPropagation=true;}
  function wheel(event){
    if(destroyed||event.defaultPrevented||isSectionNavigationActive()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY||editable(event.target))return false;
    const requestedDirection=Math.sign(event.deltaY),now=performance.now();
    if(running){if(requestedDirection===direction){consume(event);lastWheel=now;return true;}cancel();}
    const b=bounds();
    if(requestedDirection>0){
      if(b.rect.top>innerHeight+64||b.rect.top<b.header-3||b.footerTarget-scrollY<3)return false;
    }else{
      // Inside a tall footer, let native touch scrolling reach its beginning first.
      if(scrollY>b.footerTarget+48||b.rect.top>b.header+64||scrollY-b.faqTarget<3)return false;
      if(requestedDirection===direction&&now-lastWheel<180)return false;
    }
    consume(event);lastWheel=now;travel(requestedDirection);return true;
  }
  function settle(){
    timer=0;if(destroyed||running||touch||innerWidth>1024||isSectionNavigationActive())return;
    const b=bounds(),distance=b.footerTarget-scrollY,threshold=Math.min(140,innerHeight*.16);
    if(Math.abs(distance)>threshold*1.8)latched=false;
    if(latched||b.rect.top<b.header-2||Math.abs(distance)>threshold||Math.abs(distance)<3)return;
    travel(1);
  }
  function schedule(){
    if(running)return;
    clearTimeout(timer);timer=setTimeout(settle,100);
  }
  function touchStart(event){
    cancel();lastWheel=-Infinity;
    if(event.touches.length!==1||editable(event.target)){touch=null;return;}
    const point=event.touches[0];touch={x:point.clientX,y:point.clientY,target:event.target,handled:false};
  }
  function touchMove(event){
    if(!touch||event.touches.length!==1||innerWidth>1024)return;
    if(touch.handled){consume(event);return;}
    const point=event.touches[0],dy=touch.y-point.clientY,dx=touch.x-point.clientX;
    if(Math.abs(dy)<18||Math.abs(dx)>Math.abs(dy))return;
    touch.handled=wheel({deltaY:dy,deltaX:dx,target:touch.target,cancelable:event.cancelable,
      preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation()});
  }
  function touchEnd(){touch=null;schedule();}
  function resize(){
    const header=document.getElementById('siteHeader')?.getBoundingClientRect().height||64;
    footer.style.setProperty('--footer-header-height',`${header}px`);
    if(lastWidth!==innerWidth){lastWidth=innerWidth;cancel();latched=false;}
  }
  const pointerDown=()=>cancel();
  window.addEventListener('wheel',wheel,{passive:false,capture:true});
  window.addEventListener('touchstart',touchStart,{passive:true,capture:true});
  window.addEventListener('touchmove',touchMove,{passive:false,capture:true});
  window.addEventListener('touchend',touchEnd,{passive:true});window.addEventListener('touchcancel',touchEnd,{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});window.addEventListener('pointerdown',pointerDown,{passive:true});
  reduced.addEventListener('change',cancel);resize();
  return ()=>{
    destroyed=true;cancel();detachNavigation();delete footer.dataset.snap;footer.style.removeProperty('--footer-header-height');
    window.removeEventListener('wheel',wheel,true);window.removeEventListener('touchstart',touchStart,true);window.removeEventListener('touchmove',touchMove,true);
    window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',touchEnd);window.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',resize);window.removeEventListener('pointerdown',pointerDown);reduced.removeEventListener('change',cancel);
  };
}
