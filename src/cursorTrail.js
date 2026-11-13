import './cursorTrail.css';
import { CursorTrailRibbon } from './cursorTrailRibbon.js';

// Split only top-level CSS image layers; gradients may contain their own commas.
function imageLayers(value){let depth=0,start=0;const layers=[];for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(value[i]===','&&!depth){layers.push(value.slice(start,i));start=i+1;}}layers.push(value.slice(start));return layers;}
export function initCursorTrail(){
  if(window.praxisCursorTrail)return window.praxisCursorTrail;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(any-pointer:fine)');
  const canvas=document.createElement('canvas');canvas.className='cursor-trail-canvas';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');const surfaces=new Map();
  const ribbon=new CursorTrailRibbon();
  let active=null,points=[],head=null,raf=0,dpr=1,sizeKey='',destroyed=false;
  const enabled=()=>!destroyed&&!reduced.matches&&fine.matches&&!document.hidden;
  function surface(host){
    if(surfaces.has(host))return surfaces.get(host);
    const styles=getComputedStyle(host);
    const properties=['backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition','backgroundAttachment','backgroundOrigin','backgroundClip'];
    const original=Object.fromEntries(properties.map(key=>[key,host.style[key]]));
    const computed=styles.backgroundImage;
    const layers=imageLayers(computed),hasNoise=layers.some(v=>v.includes('section-noise.png'));
    const plane=document.createElement('div');plane.className='cursor-trail-plane';plane.setAttribute('aria-hidden','true');
    if(hasNoise){
      const retained=layers.map((value,index)=>({value,index})).filter(layer=>!layer.value.includes('section-noise.png'));
      // Image layers and their paint settings are parallel lists. Removing only
      // the image makes the remaining gradient inherit the noise's 256px repeat.
      const paint=Object.fromEntries(properties.slice(1).map(key=>[key,imageLayers(styles[key])]));
      host.style.backgroundImage=retained.map(layer=>layer.value).join(',')||'none';
      for(const [key,values] of Object.entries(paint))host.style[key]=retained.map(layer=>values[layer.index%values.length]).join(',')||values[0];
      const noise=document.createElement('div');noise.className='cursor-trail-noise';plane.append(noise);
    }
    const hadClass=host.classList.contains('cursor-trail-surface');host.classList.add('cursor-trail-surface');host.prepend(plane);
    const result={host,plane,original,hadClass,hasNoise};surfaces.set(host,result);return result;
  }
  function clear(){cancelAnimationFrame(raf);raf=0;points=[];head=null;ctx.clearRect(0,0,canvas.width,canvas.height);}
  function draw(now){
    raf=0;if(!enabled()||!active){clear();return;}
    points=points.filter(p=>now-p.t<1200);
    if(!points.length){clear();return;}
    const rect=active.host.getBoundingClientRect(),scale=rect.width/active.host.offsetWidth;
    const top=Math.max(0,-rect.top/scale),width=active.host.offsetWidth;
    const height=Math.max(1,Math.min(active.host.offsetHeight-top,innerHeight/scale));
    dpr=Math.min(devicePixelRatio*scale,1.25,Math.sqrt(1800000/(width*height)));
    const key=`${width}/${height}/${dpr}`;
    if(key!==sizeKey){sizeKey=key;canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;}
    canvas.style.top=`${top}px`;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    ribbon.draw(ctx,points,now,rect,scale,top);
    ctx.globalAlpha=1;raf=requestAnimationFrame(draw);
  }
  function move(event){
    if(!enabled()||event.pointerType==='touch')return;
    const section=event.target.closest?.('section,footer,.ending-signature,.affiliates-dark-band');
    if(!section)return;
    const host=section.id==='inicio'?section.querySelector('.hero-bg-layer'):section;
    if(!host)return;
    if(active?.host!==host){clear();active=surface(host);active.plane.prepend(canvas);sizeKey='';}
    const now=performance.now(),x=event.clientX,y=event.clientY;
    if(head){
      const dx=x-head.x,dy=y-head.y,distance=Math.hypot(dx,dy),steps=Math.min(18,Math.ceil(distance/10));
      for(let i=1;i<steps;i++){const t=i/steps;points.push({x:head.x+dx*t,y:head.y+dy*t,t:now-12*(1-t),radius:27,phase:now*.001});}
    }
    // The newest point is the pointer itself: no lerp, artboard offset or scrollY.
    head={x,y};points.push({x,y,t:now,radius:29,phase:now*.001});points=points.slice(-64);
    if(!raf)raf=requestAnimationFrame(draw);
  }
  const leave=()=>{head=null;};
  const preference=()=>{clear();};
  window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',preference);reduced.addEventListener('change',preference);fine.addEventListener('change',preference);
  const api={getState:()=>({enabled:enabled(),active:active?.host.closest('section,footer')?.id||active?.host.tagName,head,points:points.length,rafActive:!!raf,pixels:canvas.width*canvas.height,noiseAbove:active?.hasNoise||false}),destroy(){
    destroyed=true;clear();window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',preference);reduced.removeEventListener('change',preference);fine.removeEventListener('change',preference);
    for(const data of surfaces.values()){data.plane.remove();for(const [key,value] of Object.entries(data.original))data.host.style[key]=value;if(!data.hadClass)data.host.classList.remove('cursor-trail-surface');}
    ribbon.destroy();canvas.remove();delete window.praxisCursorTrail;
  }};
  window.praxisCursorTrail=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
