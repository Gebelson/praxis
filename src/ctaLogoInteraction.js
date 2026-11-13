// Decorative 3D drift; native transform animations avoid a JavaScript frame loop.
export function initCtaLogoInteraction(card) {
  const pieces=[...card.querySelectorAll('.cta-logo-piece')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let animations=[],visible=false,destroyed=false;
  const pose=(x,y,rx,ry)=>`perspective(1600px) translate3d(${x}px,${y}px,0) rotateX(${rx}deg) rotateY(${ry}deg) rotate(var(--logo-angle,0deg))`;
  function update(){
    if(destroyed)return;
    if(motion.matches){animations.forEach(animation=>animation.cancel());animations=[];return;}
    if(!animations.length){
      animations=pieces.map((piece,index)=>{
        const depth=index?-.8:1;
        const keyframes=[[0,0,0,0],[8,-5,2,-3],[0,-8,0,0],[-8,-3,-2,3],[0,0,0,0]];
        // Zero velocity at every turn also keeps the loop seam smooth.
        const animation=piece.animate(keyframes.map(values=>({transform:pose(...values.map(value=>value*depth)),easing:'cubic-bezier(.45,0,.55,1)'})),{
          duration:index?14000:12000,iterations:Infinity,easing:'linear',
        });
        animation.pause();return animation;
      });
    }
    animations.forEach(animation=>visible&&!document.hidden?animation.play():animation.pause());
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});
  observer.observe(card);
  document.addEventListener('visibilitychange',update);
  motion.addEventListener('change',update);
  update();
  return {destroy(){
    destroyed=true;observer.disconnect();animations.forEach(animation=>animation.cancel());animations=[];
    document.removeEventListener('visibilitychange',update);motion.removeEventListener('change',update);
  }};
}
