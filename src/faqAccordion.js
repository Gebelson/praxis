export function initFaqAccordion(root,{onLayout=()=>{}}={}){
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),items=[];
  const originalPaddingBottom=root.style.paddingBottom;
  let frame=0,snapFrame=0,destroyed=false;
  const update=()=>{frame=0;if(destroyed)return;onLayout();if(items.some(item=>item.animation))frame=requestAnimationFrame(update);};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  for(const card of root.querySelectorAll('.faq-card')){
    const trigger=card.querySelector('.faq-trigger'),answer=card.querySelector('.faq-answer');
    if(!trigger||!answer)continue;
    const item={trigger,answer,animation:null};items.push(item);
    const finish=open=>{
      answer.hidden=!open;answer.inert=!open;answer.setAttribute('aria-hidden',String(!open));
      if(item.animation){item.animation.onfinish=null;item.animation.cancel();item.animation=null;}
      answer.style.overflow='';
      if(!open&&!items.some(other=>other.trigger.getAttribute('aria-expanded')==='true'))root.style.paddingBottom=originalPaddingBottom;
      onLayout();

    };
    const snap=()=>{
      cancelAnimationFrame(snapFrame);
      root.style.paddingBottom=originalPaddingBottom;
      root.dispatchEvent(new Event('praxis:faq-reading'));
      const rect=card.getBoundingClientRect(),header=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
      const closingAbove=items.filter(other=>other!==item&&other.animation&&other.trigger.getAttribute('aria-expanded')!=='true'&&(other.answer.compareDocumentPosition(card)&Node.DOCUMENT_POSITION_FOLLOWING)).reduce((sum,other)=>sum+other.answer.getBoundingClientRect().height,0);
      const top=header+Math.max(16,(innerHeight-header-rect.height)/2);
      const destination=Math.max(0,scrollY+rect.top-closingAbove-top);
      const footer=document.querySelector('.site-footer');
      if(footer){
        const ratio=root.getBoundingClientRect().width/root.offsetWidth||1;
        const closing=items.filter(other=>other!==item&&other.animation&&other.trigger.getAttribute('aria-expanded')!=='true').reduce((sum,other)=>sum+other.answer.getBoundingClientRect().height,0);
        const extra=Math.max(0,destination+innerHeight+1-(scrollY+footer.getBoundingClientRect().top-closing));
        if(extra>0)root.style.paddingBottom=`${parseFloat(getComputedStyle(root).paddingBottom)+extra/ratio}px`;
        onLayout();
      }
      snapFrame=requestAnimationFrame(()=>{
        snapFrame=0;if(!destroyed&&trigger.getAttribute('aria-expanded')==='true')window.scrollTo({top:destination,behavior:reduced.matches?'instant':'smooth'});
      });
    };
    item.click=()=>{
      const open=trigger.getAttribute('aria-expanded')!=='true';
      if(open)for(const other of items){if(other!==item&&other.trigger.getAttribute('aria-expanded')==='true')other.click();}
      const current=answer.hidden?null:getComputedStyle(answer);
      const from=current?{height:current.height,paddingBottom:current.paddingBottom,opacity:current.opacity,transform:current.transform}:{height:'0px',paddingBottom:'0px',opacity:0,transform:'translateY(-6px)'};
      trigger.setAttribute('aria-expanded',String(open));
      if(item.animation){item.animation.onfinish=null;item.animation.cancel();item.animation=null;}
      if(reduced.matches){finish(open);if(open)snap();return;}
      answer.hidden=false;answer.inert=!open;answer.setAttribute('aria-hidden',String(!open));
      const natural=getComputedStyle(answer),height=answer.offsetHeight,padding=natural.paddingBottom;
      if(open)snap();
      answer.style.overflow='hidden';
      const to=open?{height:`${height}px`,paddingBottom:padding,opacity:1,transform:'translateY(0px)'}:{height:'0px',paddingBottom:'0px',opacity:0,transform:'translateY(-6px)'};
      item.animation=answer.animate([from,to],{duration:open?360:280,easing:'cubic-bezier(.22,.75,.25,1)',fill:'both'});
      item.animation.onfinish=()=>finish(open);schedule();
    };
    trigger.addEventListener('click',item.click);
  }
  const preference=()=>{if(reduced.matches)items.forEach(item=>item.animation?.finish());};
  reduced.addEventListener('change',preference);
  const api={destroy(){destroyed=true;root.style.paddingBottom=originalPaddingBottom;cancelAnimationFrame(frame);cancelAnimationFrame(snapFrame);reduced.removeEventListener('change',preference);for(const item of items){item.trigger.removeEventListener('click',item.click);if(item.animation){item.animation.onfinish=null;item.animation.cancel();}item.answer.hidden=item.trigger.getAttribute('aria-expanded')!=='true';item.answer.style.overflow='';}}};
  import.meta.hot?.dispose(()=>api.destroy());return api;
}
