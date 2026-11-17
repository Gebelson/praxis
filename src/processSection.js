import { devmodeSnapTarget,initDevmodeSnap } from './devmodeSnap.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { processState,processScrollRange,processNumberPosition } from './lib/processProgress.js';
import { createProcessSnap } from './lib/processSnap.js';
gsap.registerPlugin(ScrollTrigger);

export function initProcessSection() {
  const section=document.querySelector('.sec-process');
  if(!section)return;
  if(section.praxisProcess)return section.praxisProcess;
  const left=section.querySelector('.process-left-region');
  const sticky=section.querySelector('.process-sticky-box');
  const list=section.querySelector('.process-steps-list');
  const timeline=section.querySelector('.process-timeline-bar');
  const track=document.getElementById('processTimelineTrack');
  const fill=document.getElementById('processTimelineProgress');
  const unitTrack=document.getElementById('processUnitTrack');
  const units=[...section.querySelectorAll('.process-unit-item')];
  const steps=[...section.querySelectorAll('.process-step-item')];
  const dots=[...section.querySelectorAll('.process-dot')];
  if(!list||!steps.length)return;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let unitHeight=270;
  let positions=[],activeStep=-1,progress=0,frame=0,layoutFrame=0,destroyed=false,trigger,magnet;
  const scale=()=>section.getBoundingClientRect().width/section.offsetWidth||1;

  function mobileComposition(index){
    const step=steps[Math.max(0,index)],title=step.querySelector('.process-step-title').getBoundingClientRect(),body=step.querySelector('.process-step-body').getBoundingClientRect();
    const contentHeight=body.bottom-title.top;
    const header=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
    const top=header+Math.max(12,(innerHeight-header-sticky.offsetHeight-24-contentHeight)/2);
    return {top,contentCenter:top+sticky.offsetHeight+24+contentHeight/2};
  }
  function mobileTargets(){
    const top=timeline.getBoundingClientRect().top+scrollY;
    return positions.map((y,index)=>top+y*scale()-mobileComposition(index).contentCenter);
  }
  function updateSticky() {
    if(innerWidth<=1024){
      const headerBottom=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
      const top=left.getBoundingClientRect().top,grid=left.parentElement.getBoundingClientRect();
      const finalAnchor=mobileTargets().at(-1)+mobileComposition(steps.length-1).top;
      const maximum=Math.max(0,Math.min(grid.bottom-top-sticky.offsetHeight,finalAnchor-(top+scrollY)));
      const y=Math.max(0,Math.min(maximum,mobileComposition(activeStep).top-top));
      sticky.style.transform=`translateY(${y}px)`;
      const sectionRect=section.getBoundingClientRect(),stickyRect=sticky.getBoundingClientRect();
      sticky.style.setProperty('--process-follow-x',`${sectionRect.left-stickyRect.left+12}px`);
      sticky.style.setProperty('--process-follow-y',`${sectionRect.top-stickyRect.top+12}px`);
      list.style.setProperty('--process-content-clip',`${Math.max(0,stickyRect.bottom-list.getBoundingClientRect().top+8)}px`);
      return;
    }
    list.style.removeProperty('--process-content-clip');
    const ratio=scale(),top=left.getBoundingClientRect().top;
    const height=sticky.getBoundingClientRect().height/ratio;
    const timelineOffset=(timeline.getBoundingClientRect().top-top)/ratio;
    // Align both the initial and final block centers with their content markers.
    const first=timelineOffset+(positions[0]||0)-height/2;
    const last=timelineOffset+(positions.at(-1)||0)-height/2;
    const maximum=Math.min(left.offsetHeight-height,last);
    const minimum=Math.min(first,maximum);
    const anchor=(innerHeight-height*ratio)/2;
    const y=Math.max(minimum,Math.min(maximum,(anchor-top)/ratio));
    sticky.style.transform=`translateY(${y}px)`;
  }
  function apply(value) {
    if(destroyed)return;
    const progressPositions=innerWidth<=1024?mobileTargets():positions;
    const state=processState(value,progressPositions);progress=state.progress;
    fill.style.transform=`scaleY(${progress})`;
    const numberPosition=reducedMotion.matches?state.activeStep:processNumberPosition(progress,progressPositions);
    unitTrack.style.transform=`translateY(${-unitHeight*numberPosition}px)`;
    if(activeStep!==state.activeStep){
      activeStep=state.activeStep;
      section.dataset.activeStep=String(activeStep);
      section.dataset.processInitialized='true';
      steps.forEach((step,index)=>{
        step.classList.toggle('is-active',index===activeStep);
        if(index===activeStep)step.setAttribute('aria-current','step');
        else step.removeAttribute('aria-current');
      });
      dots.forEach((dot,index)=>dot.classList.toggle('is-active',index<=activeStep));
    }
    updateSticky();
  }
  function layout() {
    if(destroyed)return;
    const ratio=scale();
    if(innerWidth<=1024){
      section.style.setProperty('--process-header-height',`${document.getElementById('siteHeader')?.getBoundingClientRect().height||64}px`);
      sticky.style.setProperty('--process-follow-image',getComputedStyle(section).backgroundImage);
      sticky.style.setProperty('--process-follow-height',`${section.offsetHeight}px`);
      sticky.style.setProperty('--process-follow-width',`${section.offsetWidth}px`);
    }
    if(innerWidth>1024){
      const css=getComputedStyle(section),padding=parseFloat(css.paddingTop)||0,base=parseFloat(css.getPropertyValue('--process-base-padding'))||padding;
      const title=steps[0].querySelector('.process-step-title').getBoundingClientRect(),body=steps[0].querySelector('.process-step-body').getBoundingClientRect();
      const contentOffset=((title.top+body.bottom)/2-section.getBoundingClientRect().top)/ratio-padding;
      const headerBottom=Math.max(0,document.querySelector('header')?.getBoundingClientRect().bottom||0);
      const desired=Math.max(base,(innerHeight/2-headerBottom)/ratio-contentOffset);
      if(Math.abs(desired-padding)>.25)section.style.setProperty('--process-top-padding',`${desired}px`);
    }else{
      section.style.removeProperty('--process-top-padding');
      const headerBottom=document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0;
      section.style.setProperty('--process-mobile-top-padding',`${Math.max(96,mobileComposition(0).top-headerBottom+16)}px`);
    }
    const top=timeline.getBoundingClientRect().top;
    // Center markers on the combined visible heading and description, excluding
    // the step's large scroll-spacing padding.
    positions=steps.map((step,index)=>{
      const title=step.querySelector('.process-step-title').getBoundingClientRect();
      const body=step.querySelector('.process-step-body').getBoundingClientRect();
      const y=((title.top+body.bottom)/2-top)/ratio;
      dots[index].style.top=`${y}px`;return y;
    });
    track.style.top=`${positions[0]}px`;
    track.style.height=`${positions.at(-1)-positions[0]}px`;
    // Reapply digit spacing after a breakpoint/font resize even if step is unchanged.
    unitHeight=units[0]?.offsetHeight||270;
    activeStep=-1;trigger?.refresh();apply(trigger?.progress||0);
  }
  function scheduleLayout() {
    magnet?.cancel();
    if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;layout();});
  }
  function onHeroLayout() {
    ScrollTrigger.sort();ScrollTrigger.refresh();scheduleLayout();
  }
  function onScroll() {
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;updateSticky();});
  }
  function scrollRange() {
    if(innerWidth<=1024){const targets=mobileTargets();return {start:targets[0]||0,end:targets.at(-1)||0};}
    return processScrollRange(timeline.getBoundingClientRect().top+scrollY,positions,scale(),innerHeight);
  }
  layout();
  trigger=ScrollTrigger.create({
    id:'praxis-process',trigger:list,refreshPriority:-1,
    start:()=>scrollRange().start,
    end:()=>scrollRange().end,
    invalidateOnRefresh:true,
    onUpdate:self=>apply(self.progress),
    onRefresh:self=>apply(self.progress),
  });
  function snapTargets() {
    const range=scrollRange(),ratio=scale();
    const targets=innerWidth<=1024?mobileTargets():positions.map(y=>range.start+(y-positions[0])*ratio);
    const card=section.querySelector('.cta-banner-card');
    if(card){
      // Layout offsets exclude the card's temporary entrance translation and scale.
      const cardTop=section.getBoundingClientRect().top+card.offsetTop*ratio;
      const cardHeight=card.offsetHeight*ratio;
      const headerBottom=Math.max(0,document.querySelector('header')?.getBoundingClientRect().bottom||0);
      // Center the card in the usable viewport; tall mobile cards align below the header.
      const top=headerBottom+Math.max(16,(innerHeight-headerBottom-cardHeight)/2);
      const destination=scrollY+cardTop-top;
      if(destination>targets.at(-1))targets.push(destination);
    }
    return targets;
  }
  const devmodeSnap=initDevmodeSnap(()=>magnet?.getState().snapping);
  function magnetTargets(){
    const targets=snapTargets(),devmode=devmodeSnapTarget();
    if(innerWidth<=1024){
      const next=section.nextElementSibling,header=document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0;
      if(next){const destination=next.getBoundingClientRect().top+scrollY-header;if(destination>targets.at(-1))targets.push(destination);}
    }
    return devmode!==null&&devmode<targets[0]?[devmode,...targets]:targets;
  }
  magnet=createProcessSnap({
    getActiveIndex:()=>magnetTargets().reduce((best,y,index,targets)=>Math.abs(y-scrollY)<Math.abs(targets[best]-scrollY)?index:best,0),
    getTargets:magnetTargets,
    getCardTarget:()=>snapTargets().at(-1),
    getSmoother:()=>document.getElementById('inicio')?.praxisHero?.trigger?.smoother,
  });
  const observer=new ResizeObserver(scheduleLayout);
  observer.observe(section);steps.forEach(step=>observer.observe(step));
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',scheduleLayout,{passive:true});
  window.addEventListener('praxis:hero-layout',onHeroLayout);
  document.fonts?.ready.then(()=>{if(!destroyed)scheduleLayout();});
  const api={
    getActiveStep:()=>activeStep,
    getDotPositions:()=>[...positions],
    getState:()=>({activeStep,progress,start:trigger.start,end:trigger.end,positions:[...positions],snapTargets:snapTargets(),snap:magnet.getState()}),
    layoutTimeline:layout,
    update:()=>{ScrollTrigger.update();apply(trigger.progress);},
    destroy:()=>{
      destroyed=true;cancelAnimationFrame(frame);cancelAnimationFrame(layoutFrame);
      devmodeSnap?.destroy();magnet.destroy();observer.disconnect();trigger.kill();
      window.removeEventListener('scroll',onScroll);
      window.removeEventListener('resize',scheduleLayout);
      window.removeEventListener('praxis:hero-layout',onHeroLayout);
      sticky.style.transform='';list.style.removeProperty('--process-content-clip');section.style.removeProperty('--process-top-padding');delete section.praxisProcess;
      if(window.PraxisProcessSection===api)delete window.PraxisProcessSection;
    },
  };
  section.praxisProcess=api;window.PraxisProcessSection=api;return api;
}
