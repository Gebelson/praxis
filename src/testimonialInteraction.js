export function initTestimonialInteraction(){
  const section=document.querySelector('.sec-testimonials');
  if(!section||section.testimonialInteraction)return section?.testimonialInteraction;
  const allowed=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  const active=new Set(),cleanups=[],resets=[],records=[];
  let frame=0,scrollFrame=0,lastTime=0,destroyed=false,cursor=null;
  function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(tick);}
  function paint(item){
    const {card,x,y,shine}=item,magnitude=Math.hypot(x,y);
    card.style.rotate=magnitude>.001?`${-y} ${x} 0 ${magnitude*4.5}deg`:'none';
    card.style.setProperty('--feedback-reflection-x',`${50+x*45}%`);
    card.style.setProperty('--feedback-reflection-y',`${50+y*45}%`);
    card.style.setProperty('--feedback-reflection',String(shine));
  }
  function clear(item){
    item.card.style.removeProperty('rotate');
    for(const key of ['--feedback-reflection-x','--feedback-reflection-y','--feedback-reflection'])item.card.style.removeProperty(key);
    item.card.classList.remove('is-interacting');
  }
  function tick(time){
    frame=0;const delta=Math.min(lastTime?time-lastTime:16,40);lastTime=time;
    for(const item of active){
      const ease=1-Math.exp(-delta/(item.targetShine?85:240));
      const lightEase=1-Math.exp(-delta/(item.targetShine?85:280));
      item.x+=(item.tx-item.x)*ease;item.y+=(item.ty-item.y)*ease;item.shine+=(item.targetShine-item.shine)*lightEase;paint(item);
      if(Math.abs(item.x-item.tx)+Math.abs(item.y-item.ty)+Math.abs(item.shine-item.targetShine)<.002){
        item.x=item.tx;item.y=item.ty;item.shine=item.targetShine;paint(item);active.delete(item);
        if(!item.targetShine)clear(item);
      }
    }
    if(active.size)schedule();else lastTime=0;
  }
  section.querySelectorAll('.testimonial-card').forEach(card=>{
    const item={card,x:0,y:0,tx:0,ty:0,shine:0,targetShine:0,bounds:null};
    const enter=event=>{
      if(!allowed.matches||event.pointerType==='touch')return;
      item.bounds=card.getBoundingClientRect();card.classList.add('is-interacting');move(event);
    };
    const move=event=>{
      if(!allowed.matches||!item.bounds||event.pointerType==='touch')return;
      const r=item.bounds;
      item.tx=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));
      item.ty=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));
      item.targetShine=1;active.add(item);schedule();
    };
    const leave=()=>{item.bounds=null;item.tx=0;item.ty=0;item.targetShine=0;active.add(item);schedule();};
    records.push({item,enter,leave});
    const reset=()=>{active.delete(item);item.x=item.y=item.tx=item.ty=item.shine=item.targetShine=0;item.bounds=null;clear(item);};
    card.addEventListener('pointerenter',enter);card.addEventListener('pointermove',move);card.addEventListener('pointerleave',leave);card.addEventListener('pointercancel',leave);
    cleanups.push(()=>{reset();card.removeEventListener('pointerenter',enter);card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',leave);card.removeEventListener('pointercancel',leave);});
    resets.push(reset);
  });
  const reset=()=>{resets.forEach(fn=>fn());cancelAnimationFrame(frame);cancelAnimationFrame(scrollFrame);frame=scrollFrame=0;lastTime=0;};
  const trackCursor=event=>{if(event.pointerType!=='touch')cursor={clientX:event.clientX,clientY:event.clientY,pointerType:event.pointerType};};
  function refreshUnderCursor(){
    scrollFrame=0;if(destroyed||!allowed.matches||!cursor||document.hidden)return;
    const hit=document.elementFromPoint(cursor.clientX,cursor.clientY)?.closest('.testimonial-card');
    for(const record of records){
      if(record.item.card===hit)record.enter(cursor);
      else if(record.item.targetShine)record.leave();
    }
  }
  const onScroll=()=>{if(!scrollFrame&&cursor&&allowed.matches)scrollFrame=requestAnimationFrame(refreshUnderCursor);};
  const visibility=()=>{if(document.hidden)reset();};
  allowed.addEventListener('change',reset);window.addEventListener('pointermove',trackCursor,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',reset);document.addEventListener('visibilitychange',visibility);
  const api={destroy(){destroyed=true;cancelAnimationFrame(frame);cancelAnimationFrame(scrollFrame);cleanups.forEach(fn=>fn());allowed.removeEventListener('change',reset);window.removeEventListener('pointermove',trackCursor);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',reset);document.removeEventListener('visibilitychange',visibility);delete section.testimonialInteraction;}};
  section.testimonialInteraction=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
