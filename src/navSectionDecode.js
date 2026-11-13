import { decodeText } from './decodeText.js';

export function initNavSectionDecode(nav=document.querySelector('.main-nav'),{period=6000,duration=650}={}) {
  if(!nav||nav.navSectionDecode)return nav?.navSectionDecode;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const sections=[...document.querySelectorAll('section')];
  const items=[...nav.querySelectorAll('.nav-link')].map(link=>{
    const label=link.querySelector('.nav-label'),href=link.getAttribute('href');
    const section=document.getElementById(href?.slice(1))?.closest('section');
    if(!label||!section)return null;
    const item={link,label,href,section,text:label.textContent,width:label.style.width,overflow:label.style.overflow,aria:link.getAttribute('aria-label'),hidden:label.getAttribute('aria-hidden'),current:link.getAttribute('aria-current')};
    link.setAttribute('aria-label',item.text);label.setAttribute('aria-hidden','true');
    return item;
  }).filter(Boolean);
  let active=null,cancel=null,timer=0,frame=0,ready=false,destroyed=false,cycles=0;
  function stop(){clearTimeout(timer);timer=0;cancel?.();cancel=null;}
  function eligible(){return ready&&!destroyed&&!document.hidden&&!motion.matches&&active?.link.isConnected;}
  function pulse(){
    timer=0;if(!eligible())return;
    cancel?.();cancel=decodeText(active.label,{duration,fps:18,delay:0});cycles++;
    nav.dataset.decodeCycle=String(cycles);
    timer=setTimeout(pulse,period);
  }
  function arm(delay=120){stop();if(eligible())timer=setTimeout(pulse,delay);}
  function choose(){
    frame=0;if(!ready||destroyed)return;
    const header=document.querySelector('header');
    const headerBottom=Math.max(0,Math.min(innerHeight,header?.getBoundingClientRect().bottom||0));
    const probe=headerBottom+(innerHeight-headerBottom)*.45;
    const section=sections.find(section=>{const r=section.getBoundingClientRect();return r.top<=probe&&r.bottom>probe;});
    const matches=items.filter(item=>item.section===section);
    const next=matches.find(item=>item.href===location.hash)||matches[0]||null;
    if(next===active)return;
    stop();active?.link.removeAttribute('aria-current');active?.link.removeAttribute('data-nav-section-active');
    active=next;nav.dataset.decodeSection=section?.id||'';
    if(active){active.link.setAttribute('aria-current','location');active.link.dataset.navSectionActive='true';}
    arm();
  }
  function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(choose);}
  function measure(){
    if(!ready||destroyed)return;cancel?.();cancel=null;
    for(const item of items){item.label.textContent=item.text;item.label.style.width=item.width;}
    const widths=items.map(item=>getComputedStyle(item.label).width);
    items.forEach((item,i)=>{item.label.style.width=widths[i];item.label.style.overflow='hidden';});schedule();
  }
  function preference(){stop();schedule();if(eligible())arm();}
  function visibility(){stop();if(!document.hidden){schedule();arm();}}
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('praxis:hero-layout',measure);
  document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',preference);
  const api={getState:()=>({activeHref:active?.href||null,section:nav.dataset.decodeSection,cycles,period,duration}),destroy(){
    destroyed=true;stop();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);window.removeEventListener('hashchange',schedule);window.removeEventListener('praxis:hero-layout',measure);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',preference);
    for(const item of items){item.label.textContent=item.text;item.label.style.width=item.width;item.label.style.overflow=item.overflow;
      for(const [element,name,value] of [[item.link,'aria-label',item.aria],[item.label,'aria-hidden',item.hidden],[item.link,'aria-current',item.current]]){if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);}
      item.link.removeAttribute('data-nav-section-active');
    }
    delete nav.dataset.decodeSection;delete nav.dataset.decodeCycle;delete nav.navSectionDecode;
  }};
  nav.navSectionDecode=api;
  document.fonts.ready.then(()=>{if(destroyed)return;ready=true;measure();});
  import.meta.hot?.dispose(()=>api.destroy());return api;
}
