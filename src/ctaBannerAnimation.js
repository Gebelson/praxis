import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCtaLogoInteraction } from './ctaLogoInteraction.js';

gsap.registerPlugin(ScrollTrigger);

export function initCtaBannerAnimation() {
  const card=document.querySelector('.sec-process .cta-banner-card');
  if(!card)return;
  const logoInteraction=initCtaLogoInteraction(card);
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
    // Layout-based snap targets exclude this rotation, so the destination stays stable.
    gsap.set(card,{
      rotationX:35,transformPerspective:2200,transformOrigin:'50% 100%',
      backfaceVisibility:'hidden',visibility:'hidden',force3D:true,
    });
    const timeline=gsap.timeline({paused:true,onUpdate:()=>{
      card.style.visibility=timeline.progress()>0?'visible':'hidden';
    }}).to(card,{rotationX:0,duration:1,ease:'power1.inOut'});
    const targets=()=>window.PraxisProcessSection?.getState().snapTargets||[];
    const trigger=ScrollTrigger.create({
      id:'praxis-cta-flip',trigger:card,refreshPriority:-2,
      start:()=>Math.ceil(targets()[5]??0),
      end:()=>Math.ceil(targets()[6]??1),
      animation:timeline,scrub:true,invalidateOnRefresh:true,
    });
    return ()=>{trigger.kill();timeline.kill();card.style.removeProperty('visibility');};
  });
  return {logoInteraction,destroy(){media.revert();logoInteraction?.destroy?.();}};
}
