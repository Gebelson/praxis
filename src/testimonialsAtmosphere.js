export function initTestimonialsAtmosphere() {
  const section=document.querySelector('.sec-testimonials');
  if(!section)return;
  let visible=false;
  const update=()=>{section.dataset.atmosphere=visible&&!document.hidden?'running':'paused';};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});
  observer.observe(section);document.addEventListener('visibilitychange',update);update();
  return {destroy(){observer.disconnect();document.removeEventListener('visibilitychange',update);delete section.dataset.atmosphere;}};
}
