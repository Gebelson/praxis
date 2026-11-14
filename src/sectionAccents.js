import { decodeText } from './decodeText.js';
import './sectionAccents.css';

// Short, view-triggered accents. No scroll controller, pin or idle animation loop.
export function initSectionAccents(){
  if(window.PraxisSectionAccents)return window.PraxisSectionAccents;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),records=[],labels=[];
  let destroyed=false;
  function label(element){
    const text=element.textContent,aria=element.getAttribute('aria-label');
    const ghost=document.createElement('span'),glyph=document.createElement('span');
    ghost.className='section-accent-label-ghost';ghost.textContent=text;ghost.setAttribute('aria-hidden','true');
    glyph.className='section-accent-label-glyph';glyph.textContent=text;glyph.setAttribute('aria-hidden','true');
    const accessible=document.createElement('span');accessible.className='visually-hidden';accessible.textContent=text;
    element.removeAttribute('aria-label');element.classList.add('section-accent-label');element.replaceChildren(accessible,ghost,glyph);
    const item={element,text,aria,glyph};labels.push(item);return item;
  }
  function register(selector,type,getLabels=()=>[]){
    document.querySelectorAll(selector).forEach((element,index)=>{
      const record={element,type,delay:Math.min(index%3,2)*90,visible:false,played:false,animation:null,cancels:[],labels:getLabels(element).map(label),runs:0};
      element.dataset.accentState='idle';records.push(record);
    });
  }
  register('.sec-testimonials .testimonial-card','card');
  register('.affiliates-top .aff-step','affiliate',element=>[element.querySelector('.aff-step-text')].filter(Boolean));
  register('.footer-about,.footer-link-column,.footer-meta','footer',element=>[...element.querySelectorAll('h3')]);
  function stop(item){
    if(item.animation){item.animation.onfinish=null;item.animation.cancel();item.animation=null;}
    item.cancels.forEach(cancel=>cancel());item.cancels=[];
  }
  function play(item){
    if(destroyed||reduced.matches||document.hidden||item.played)return;
    stop(item);item.played=true;item.runs++;item.element.dataset.accentState='entering';
    const target=item.type==='affiliate'?item.element.querySelector('.aff-step-icon'):item.element;
    if(!target)return;
    const frames=item.type==='card'?
      [{opacity:.55,transform:'translateY(22px)',clipPath:'inset(0 0 12% 0 round 24px)'},{opacity:1,transform:'translateY(0)',clipPath:'inset(0 0 0 0 round 24px)'}]:
      item.type==='affiliate'?
      [{opacity:.35,transform:'perspective(800px) translateY(18px) rotateX(8deg) rotateY(-16deg) scale(.94)'},{opacity:1,transform:'perspective(800px) translateY(-3px) rotateX(0deg) rotateY(2deg) scale(1)',offset:.75},{opacity:1,transform:'none'}]:
      [{opacity:.5,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}];
    item.animation=target.animate(frames,{duration:item.type==='affiliate'?640:500,delay:item.delay,easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards'});
    item.animation.onfinish=()=>{item.animation=null;item.element.dataset.accentState='done';};
    item.cancels=item.labels.map(copy=>decodeText(copy.glyph,{duration:1050,delay:item.delay+80,fps:18}));
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      const item=records.find(record=>record.element===entry.target);if(!item)continue;
      item.visible=entry.isIntersecting&&entry.intersectionRatio>=.18;
      if(!entry.isIntersecting){stop(item);item.played=false;item.element.dataset.accentState='idle';}
      else if(item.visible)play(item);
    }
  },{threshold:[0,.18,.5]});
  records.forEach(item=>observer.observe(item.element));
  const preference=()=>{
    for(const item of records){stop(item);item.played=false;item.element.dataset.accentState='idle';if(item.visible)play(item);}
  };
  reduced.addEventListener('change',preference);document.addEventListener('visibilitychange',preference);
  const api={getState:()=>records.map(item=>({type:item.type,state:item.element.dataset.accentState,runs:item.runs,running:!!item.animation})),destroy(){
    destroyed=true;observer.disconnect();reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',preference);
    records.forEach(item=>{stop(item);delete item.element.dataset.accentState;});
    labels.forEach(copy=>{copy.element.textContent=copy.text;copy.element.classList.remove('section-accent-label');if(copy.aria===null)copy.element.removeAttribute('aria-label');else copy.element.setAttribute('aria-label',copy.aria);});
    delete window.PraxisSectionAccents;
  }};
  window.PraxisSectionAccents=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
