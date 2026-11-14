import './mobileUx.css';

export function initMobileUx(){
  const header=document.getElementById('siteHeader'),nav=header?.querySelector('.main-nav');
  if(!nav||header.mobileUx)return;
  const media=matchMedia('(max-width:1024px)'),toggle=document.createElement('button');
  toggle.type='button';toggle.className='mobile-nav-toggle';toggle.setAttribute('aria-expanded','false');
  nav.id||='praxis-main-nav';toggle.setAttribute('aria-controls',nav.id);nav.before(toggle);
  function close(focus=false){toggle.setAttribute('aria-expanded','false');toggle.textContent='Navegar +';nav.dataset.mobileCollapsed=String(media.matches);nav.inert=media.matches;if(focus)toggle.focus();}
  function update(){close();window.dispatchEvent(new Event('praxis:header-layout'));}
  toggle.addEventListener('click',()=>{if(toggle.getAttribute('aria-expanded')==='true')close();else{toggle.setAttribute('aria-expanded','true');toggle.textContent='Fechar −';nav.dataset.mobileCollapsed='false';nav.inert=false;}});
  const outside=event=>{if(!header.contains(event.target))close();};
  const keyboard=event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true')close(true);};
  const choose=event=>{const link=event.target.closest('a');if(!link)return;close();if(event.detail===0){const target=document.querySelector(link.hash)?.closest('section');if(target){target.tabIndex=-1;target.focus({preventScroll:true});}}};
  const language=document.getElementById('langBtn'),label=()=>{
    if(!language)return;const text=language.querySelector('strong')?.textContent||'';
    language.dataset.shortLabel=text.startsWith('ENGLISH')?'EN':text.startsWith('ESPAÑOL')?'ES':'PT';language.setAttribute('aria-label',`Idioma: ${text}`);
  };
  const observer=new MutationObserver(label);if(language)observer.observe(language.querySelector('strong'),{childList:true,subtree:true,characterData:true});label();
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard);nav.addEventListener('click',choose);media.addEventListener('change',update);update();
  const api={destroy(){observer.disconnect();toggle.remove();nav.inert=false;delete nav.dataset.mobileCollapsed;document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);nav.removeEventListener('click',choose);media.removeEventListener('change',update);delete header.mobileUx;}};
  header.mobileUx=api;import.meta.hot?.dispose(()=>api.destroy());return api;
}
