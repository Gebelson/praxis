export function initFaqAccordion(root,{onLayout=()=>{}}={}){
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),items=[];
  let frame=0,destroyed=false;
  const update=()=>{frame=0;if(destroyed)return;onLayout();if(items.some(item=>item.animation))frame=requestAnimationFrame(update);};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  for(const card of root.querySelectorAll('.faq-card')){
    const trigger=card.querySelector('.faq-trigger'),answer=card.querySelector('.faq-answer');
    if(!trigger||!answer)continue;
    const item={trigger,answer,animation:null};items.push(item);
    const finish=open=>{
      answer.hidden=!open;answer.inert=!open;answer.setAttribute('aria-hidden',String(!open));
      if(item.animation){item.animation.onfinish=null;item.animation.cancel();item.animation=null;}
      answer.style.overflow='';onLayout();
    };
    item.click=()=>{
      const open=trigger.getAttribute('aria-expanded')!=='true';
      const current=answer.hidden?null:getComputedStyle(answer);
      const from=current?{height:current.height,paddingBottom:current.paddingBottom,opacity:current.opacity,transform:current.transform}:{height:'0px',paddingBottom:'0px',opacity:0,transform:'translateY(-6px)'};
      trigger.setAttribute('aria-expanded',String(open));
      if(item.animation){item.animation.onfinish=null;item.animation.cancel();item.animation=null;}
      if(reduced.matches){finish(open);return;}
      answer.hidden=false;answer.inert=!open;answer.setAttribute('aria-hidden',String(!open));
      const natural=getComputedStyle(answer),height=answer.offsetHeight,padding=natural.paddingBottom;
      answer.style.overflow='hidden';
      const to=open?{height:`${height}px`,paddingBottom:padding,opacity:1,transform:'translateY(0px)'}:{height:'0px',paddingBottom:'0px',opacity:0,transform:'translateY(-6px)'};
      item.animation=answer.animate([from,to],{duration:open?360:280,easing:'cubic-bezier(.22,.75,.25,1)',fill:'both'});
      item.animation.onfinish=()=>finish(open);schedule();
    };
    trigger.addEventListener('click',item.click);
  }
  const preference=()=>{if(reduced.matches)items.forEach(item=>item.animation?.finish());};
  reduced.addEventListener('change',preference);
  const api={destroy(){destroyed=true;cancelAnimationFrame(frame);reduced.removeEventListener('change',preference);for(const item of items){item.trigger.removeEventListener('click',item.click);if(item.animation){item.animation.onfinish=null;item.animation.cancel();}item.answer.hidden=item.trigger.getAttribute('aria-expanded')!=='true';item.answer.style.overflow='';}}};
  import.meta.hot?.dispose(()=>api.destroy());return api;
}
