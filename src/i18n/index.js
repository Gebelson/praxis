import messages from './messages.json';
import {resolveLanguage,supportedLanguages} from './locale.js';
const KEY='praxis-language',DRAFT='praxis-language-form-draft';
export const languageLabels={pt:'PORTUGUÊS(BR)',en:'ENGLISH(US)',es:'ESPAÑOL(ES)',zh:'中文（简体）',fr:'FRANÇAIS(FR)','pt-PT':'PORTUGUÊS(PT)'};
let current='pt';
export const t=text=>messages[text]?.[current]||text;
export const getLanguage=()=>current;
const normalize=text=>text.replace(/\s+/g,' ').trim();
export function initLanguage(){
  let saved;try{saved=localStorage.getItem(KEY);}catch{}
  current=resolveLanguage({requested:new URL(location.href).searchParams.get('lang'),saved,languages:navigator.languages?.length?navigator.languages:[navigator.language]});
  const heroCopy=document.querySelector('.hero-intro-copy');if(heroCopy)heroCopy.dataset.referenceText=heroCopy.textContent.trim();
  document.documentElement.lang={pt:'pt-BR',en:'en',es:'es',zh:'zh-CN',fr:'fr','pt-PT':'pt-PT'}[current];
  document.documentElement.dataset.language=current;
  // Run before animation controllers capture text, so their cached glyphs and
  // accessibility labels always use the selected language.
  const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest('script,style,#langSelectorWrap,[translate="no"]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const text=normalize(node.nodeValue);if(messages[text]?.[current])node.nodeValue=node.nodeValue.replace(/\S[\s\S]*\S|\S/,t(text));}
  for(const node of document.querySelectorAll('[placeholder],[aria-label],[alt]'))for(const attr of ['placeholder','aria-label','alt']){const text=node.getAttribute(attr);if(text&&messages[normalize(text)]?.[current])node.setAttribute(attr,t(normalize(text)));}
  const strong=document.querySelector('#langBtn strong');if(strong)strong.textContent=languageLabels[current];
  document.querySelectorAll('#langDropdown [role="option"]').forEach((option,index)=>{const selected=supportedLanguages[index]===current;option.setAttribute('aria-selected',String(selected));option.tabIndex=selected?0:-1;});

}
export function restoreLanguageDraft(){
  try{const draft=JSON.parse(sessionStorage.getItem(DRAFT)||'null');sessionStorage.removeItem(DRAFT);if(draft&&Date.now()-draft.time<60000)for(const item of draft.fields){const node=(item.id?document.getElementById(item.id):document.querySelectorAll('.contact-form-card input,.contact-form-card select,.contact-form-card textarea')[item.index]);if(node){node.value=item.value;if('checked' in node)node.checked=item.checked;node.dispatchEvent(new Event('change',{bubbles:true}));}}const budget=document.getElementById('inputOrcamento')?.value;[...document.querySelectorAll('.budget-pill')].find(node=>node.dataset.budget===budget)?.click();}catch{}
}
export function changeLanguage(code){
  if(!supportedLanguages.includes(code))return;
  try{localStorage.setItem(KEY,code);}catch{}
  if(code===current)return;
  // A language navigation rebuilds decoder caches cleanly without disturbing
  // approved animation internals. Keep entered form values across that reload.
  try{const fields=[...document.querySelectorAll('.contact-form-card input,.contact-form-card select,.contact-form-card textarea')].map((node,index)=>({id:node.id,index,value:node.value,checked:node.checked}));sessionStorage.setItem(DRAFT,JSON.stringify({time:Date.now(),fields}));}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',code);location.replace(url.href);
}
