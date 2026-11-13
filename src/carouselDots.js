export function initCarouselDots(container,dots) {
  if(!dots)return {reveal(){},destroy(){}};
  const anchor=document.createElement('span');anchor.className='carousel-dots carousel-dots-anchor';anchor.setAttribute('aria-hidden','true');
  dots.before(anchor);dots.classList.add('carousel-dots-portal');dots.hidden=true;document.body.append(dots);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set();
  const buttons=()=>[...dots.querySelectorAll('.carousel-dot')];
  const nextSection=container.closest('section')?.nextElementSibling;
  let revealed=false,frame=0,destroyed=false,phase='hidden',generation=0;
  dots.inert=true;dots.dataset.dotsState=phase;
  function nextVisible(){
    if(!nextSection)return false;
    const r=nextSection.getBoundingClientRect();
    return r.top<=innerHeight-Math.min(r.height*.30,innerHeight);
  }
  function setPhase(value){phase=value;dots.dataset.dotsState=value;}
  function measure(){
    const children=buttons(),gap=parseFloat(getComputedStyle(dots).gap)||0;
    const width=children.reduce((sum,dot)=>sum+(parseFloat(getComputedStyle(dot).width)||8),0)+Math.max(0,children.length-1)*gap;
    anchor.style.width=`${width}px`;anchor.style.height=`${parseFloat(getComputedStyle(children[0]).height)||8}px`;
  }
  function position(){
    frame=0;if(destroyed||!revealed)return;
    const r=anchor.getBoundingClientRect(),scale=r.width/(parseFloat(anchor.style.width)||1);
    dots.style.left=`${r.left+r.width/2}px`;dots.style.top=`${r.top-6*scale}px`;
    dots.style.transform=`translateX(-50%) scale(${scale})`;
    dots.hidden=r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth;
    if(nextVisible())conceal();
  }
  function schedule(){if(revealed&&!frame)frame=requestAnimationFrame(position);}
  function resize(){measure();schedule();}
  function stopAnimations(){generation++;for(const animation of animations)animation.cancel();animations.clear();}
  function hide(){dots.hidden=true;dots.inert=true;revealed=false;delete dots.dataset.revealed;setPhase('hidden');stopAnimations();}
  function animate(entering,from){
    const version=generation,children=buttons();let remaining=children.length;
    children.forEach((dot,index)=>{
      const animation=dot.animate([from[index],entering?{opacity:1,transform:'translateY(0) scale(1)'}:{opacity:0,transform:'translateY(6px) scale(.65)'}],{duration:240,delay:(entering?index:children.length-1-index)*55,easing:entering?'cubic-bezier(.22,1,.36,1)':'cubic-bezier(.64,0,.78,0)',fill:'both'});
      animations.add(animation);animation.onfinish=()=>{
        if(version!==generation||destroyed)return;
        if(entering){animations.delete(animation);animation.cancel();}
        if(--remaining===0){if(entering)setPhase('visible');else hide();}
      };
    });
  }
  function reveal(){
    if(destroyed||(revealed&&phase!=='exiting'))return;
    const from=buttons().map(dot=>phase==='exiting'?{opacity:getComputedStyle(dot).opacity,transform:getComputedStyle(dot).transform}:{opacity:0,transform:'translateY(6px) scale(.65)'});
    stopAnimations();revealed=true;dots.inert=false;dots.dataset.revealed='true';setPhase('entering');position();
    if(phase!=='entering')return;
    if(motion.matches){setPhase('visible');return;}animate(true,from);
  }
  function conceal(){
    if(!revealed||phase==='exiting')return;
    const from=buttons().map(dot=>({opacity:getComputedStyle(dot).opacity,transform:getComputedStyle(dot).transform}));
    stopAnimations();setPhase('exiting');dots.inert=true;
    if(motion.matches){hide();return;}animate(false,from);
  }
  function preference(){if(motion.matches){if(phase==='exiting')hide();else{stopAnimations();if(revealed)setPhase('visible');}}}
  container.addEventListener('carousel:snap-settled',reveal);
  measure();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});window.addEventListener('praxis:hero-layout',resize);motion.addEventListener('change',preference);
  const observer=new ResizeObserver(resize);observer.observe(container);observer.observe(document.body);
  // The artboard can move after a pin refresh without a native scroll event.
  const layoutObserver=new MutationObserver(schedule),wrapper=container.closest('.site-wrapper');
  if(wrapper)layoutObserver.observe(wrapper,{attributes:true,attributeFilter:['style']});
  layoutObserver.observe(document.body,{attributes:true,attributeFilter:['style']});
  function destroy(){
    if(destroyed)return;destroyed=true;container.removeEventListener('carousel:snap-settled',reveal);cancelAnimationFrame(frame);stopAnimations();observer.disconnect();layoutObserver.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);window.removeEventListener('praxis:hero-layout',resize);motion.removeEventListener('change',preference);
    anchor.replaceWith(dots);dots.classList.remove('carousel-dots-portal');dots.hidden=true;dots.style.removeProperty('left');dots.style.removeProperty('top');dots.style.removeProperty('transform');delete dots.dataset.revealed;delete dots.dataset.dotsState;dots.inert=false;
  }
  import.meta.hot?.dispose(destroy);return {reveal,destroy};
}
