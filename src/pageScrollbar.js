export function initPageScrollbar() {
  if(document.querySelector('.page-scrollbar'))return;
  const root=document.documentElement,header=document.querySelector('.site-header'),footer=document.querySelector('.site-footer');
  const track=document.createElement('div'),thumb=document.createElement('div');
  track.className='page-scrollbar';thumb.className='page-scrollbar-thumb';
  track.tabIndex=0;track.setAttribute('role','scrollbar');
  track.setAttribute('aria-label','Rolagem da página');track.setAttribute('aria-orientation','vertical');
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
  document.body.id||='praxis-page';track.setAttribute('aria-controls',document.body.id);
  track.append(thumb);document.body.append(track);root.classList.add('has-page-scrollbar');
  let frame=0,drag=null,geometry={top:0,height:0,thumb:0,max:0};
  function update(){
    frame=0;
    const top=Math.max(0,header?.getBoundingClientRect().bottom||0)+8;
    const height=Math.max(0,innerHeight-top-8),max=Math.max(0,root.scrollHeight-innerHeight);
    const size=Math.min(height,Math.max(36,height*innerHeight/Math.max(innerHeight,root.scrollHeight)));
    const progress=max?Math.max(0,Math.min(1,scrollY/max)):0;
    geometry={top,height,thumb:size,max};
    track.style.top=`${top}px`;track.style.height=`${height}px`;
    thumb.style.height=`${size}px`;thumb.style.transform=`translateY(${progress*(height-size)}px)`;
    // Keep scrollbar geometry intact; the footer occludes only the area it covers.
    const covered=footer?Math.max(0,Math.min(height,top+height-footer.getBoundingClientRect().top)):0;
    track.style.clipPath=covered?`inset(0 0 ${covered}px 0)`:'';
    track.inert=covered>=height;track.tabIndex=track.inert?-1:0;
    if(track.inert&&drag)release();
    track.hidden=!max||height<40;track.setAttribute('aria-valuenow',String(Math.round(progress*100)));
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function scrollToPosition(y){
    const target=Math.max(0,Math.min(geometry.max,y));
    const smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;
    if(smoother)smoother.scrollTo(target,{immediate:true});
    else window.scrollTo({top:target,behavior:'instant'});
    schedule();
  }
  function move(event){
    if(!drag||event.pointerId!==drag.id)return;
    const travel=geometry.height-geometry.thumb;
    scrollToPosition(travel>0?(event.clientY-geometry.top-drag.offset)/travel*geometry.max:0);
  }
  function down(event){
    if(event.button!==0)return;
    event.preventDefault();update();track.focus({preventScroll:true});
    drag={id:event.pointerId,offset:event.target===thumb?event.clientY-thumb.getBoundingClientRect().top:geometry.thumb/2};
    track.setPointerCapture(event.pointerId);track.classList.add('is-dragging');move(event);
  }
  function release(){drag=null;track.classList.remove('is-dragging');}
  function key(event){
    const step=innerHeight*.85;
    const targets={ArrowDown:scrollY+60,ArrowUp:scrollY-60,PageDown:scrollY+step,PageUp:scrollY-step,Home:0,End:geometry.max};
    if(event.key in targets){event.preventDefault();scrollToPosition(targets[event.key]);}
  }
  track.addEventListener('pointerdown',down);track.addEventListener('pointermove',move);
  track.addEventListener('pointerup',release);track.addEventListener('pointercancel',release);
  track.addEventListener('lostpointercapture',release);track.addEventListener('keydown',key);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
  const observer=new ResizeObserver(schedule);observer.observe(document.body);observer.observe(root);if(header)observer.observe(header);
  if(footer)observer.observe(footer);
  update();
  return {destroy(){
    cancelAnimationFrame(frame);observer.disconnect();track.remove();root.classList.remove('has-page-scrollbar');
    window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
  }};
}
