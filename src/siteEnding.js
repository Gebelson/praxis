import { initBudgetLogoMotion } from './budgetLogoMotion.js';
import { initFooterCover } from './footerCover.js';
import { initContactCardFollow } from './contactCardFollow.js';
import { PraxisBarcodeReveal } from './barcodeReveal.js';
import { initFooterSnap } from './footerSnap.js';
import { initFormSelects } from './formSelects.js';
export function initSiteEnding() {
  const root=document.querySelector('.site-wrapper');
  if(!root||root.siteEnding)return root?.siteEnding;
  const cleanups=[];
  cleanups.push(initFormSelects(root));
  cleanups.push(initFooterCover(root));
  cleanups.push(initFooterSnap(root));
  cleanups.push(initContactCardFollow(root));
  const endingBarcode=root.querySelector('#endingBarcodeRevealContainer');
  if(endingBarcode){const barcode=new PraxisBarcodeReveal(endingBarcode);cleanups.push(()=>barcode.destroy());}
  cleanups.push(initBudgetLogoMotion(document.querySelector('#contato')));
  const listen=(element,type,handler)=>{element.addEventListener(type,handler);cleanups.push(()=>element.removeEventListener(type,handler));};
  const layout=()=>window.dispatchEvent(new Event('praxis:page-layout'));
  // Fit the logo's actual ink bounds, including the font's side bearings.
  // Font size changes uniformly; no horizontal stretching or clipped letters.
  const wordmark=root.querySelector('.footer-wordmark');
  if(wordmark){
    const ink=wordmark.querySelector('.footer-wordmark-ink');
    const measure=document.createElement('canvas').getContext('2d');
    let previousWidth=0;
    const fit=()=>{
      const width=wordmark.clientWidth;
      if(!width||width===previousWidth)return;
      previousWidth=width;measure.font='100px Vogjer';
      let m=measure.measureText(ink.textContent);
      let size=100*width/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight);
      for(let pass=0;pass<3;pass++){
        measure.font=`${size}px Vogjer`;m=measure.measureText(ink.textContent);
        size*=width/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight);
      }
      measure.font=`${size}px Vogjer`;m=measure.measureText(ink.textContent);
      wordmark.style.fontSize=`${size}px`;
      ink.style.left=`${m.actualBoundingBoxLeft}px`;
      // End at the glyphs' lower edge, rather than the font's empty line box.
      const lineHeight=size*1.15;
      const ascent=m.fontBoundingBoxAscent??m.actualBoundingBoxAscent;
      const descent=m.fontBoundingBoxDescent??m.actualBoundingBoxDescent;
      const baseline=(lineHeight-ascent-descent)/2+ascent;
      // Keep the original line box and glass overlay in place. Trim only the
      // page's trailing space, without moving/resizing the canelado itself.
      wordmark.style.marginBottom=`-${Math.max(0,lineHeight-baseline-m.actualBoundingBoxDescent)}px`;
      layout();
    };
    const observer=new ResizeObserver(fit);
    document.fonts.ready.then(()=>{if(root.siteEnding){observer.observe(wordmark);fit();}});
    cleanups.push(()=>observer.disconnect());
  }
  const tabs=[...root.querySelectorAll('[data-partner-tab]')],panels=[...root.querySelectorAll('[data-partner-panel]')];
  function select(tab,focus=false){
    tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
    panels.forEach(panel=>{panel.hidden=panel.dataset.partnerPanel!==tab.dataset.partnerTab;});
    if(focus)tab.focus();layout();
  }
  tabs.forEach((tab,index)=>{
    listen(tab,'click',()=>select(tab));
    listen(tab,'keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();select(tabs[next],true);
    });
  });
  const number=root.querySelector('#affiliateProjectValue'),range=root.querySelector('#affiliateProjectRange'),output=root.querySelector('#affiliateCommission');
  const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  function calculate(source){
    const valid=source.value.trim()!==''&&Number.isFinite(Number(source.value))&&Number(source.value)>=0&&Number(source.value)<=50000;
    number.setAttribute('aria-invalid',String(!valid));
    if(!valid){output.value='—';return;}
    const value=Number(source.value);number.value=String(value);range.value=String(value);
    range.style.setProperty('--range-progress',`${value/500}%`);
    output.value=currency.format(value*.1);
  }
  if(number&&range&&output){listen(number,'input',()=>calculate(number));listen(range,'input',()=>calculate(range));calculate(number);}
  root.querySelectorAll('[data-affiliate-interest]').forEach(link=>listen(link,'click',()=>{
    const message=document.getElementById('textareaMensagem');
    if(message&&!message.value.trim()){message.value='Quero conhecer o programa de afiliados da Praxis.';message.dispatchEvent(new Event('input',{bubbles:true}));}
  }));
  root.querySelectorAll('.faq-card').forEach((card,index)=>{
    const button=card.querySelector('.faq-trigger'),answer=card.querySelector('.faq-answer');
    button.id=`faq-question-${index+1}`;answer.id=`faq-answer-${index+1}`;
    button.setAttribute('aria-controls',answer.id);answer.setAttribute('role','region');answer.setAttribute('aria-labelledby',button.id);
  });
  root.querySelectorAll('[data-current-year]').forEach(node=>{node.textContent=String(new Date().getFullYear());});
  layout();document.fonts.ready.then(()=>{if(root.siteEnding)layout();});
  const api={destroy(){cleanups.forEach(cleanup=>cleanup());delete root.siteEnding;}};
  root.siteEnding=api;return api;
}
