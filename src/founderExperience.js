import {t,getLanguage} from './i18n/index.js';
import './founderExperience.css';

const NS='http://www.w3.org/2000/svg';
export function initFounderExperience(host=document.querySelector('.sec2-right-portrait')) {
  if(!host||host.founderExperience)return host?.founderExperience;
  const uid='founder-experience';
  const mobileImage=matchMedia('(max-width:1024px)');
  const portraitSource=()=>mobileImage.matches?'/assets/founder-portrait-rim-light-mobile.webp':'/assets/founder-portrait-rim-light.webp';
  host.innerHTML=`<svg class="founder-experience-visual" viewBox="0 0 625 647.777778" role="img" aria-labelledby="${uid}-title" xmlns="${NS}">
    <title id="${uid}-title"></title>
    <defs>
      <mask id="${uid}-outline-guard" maskUnits="userSpaceOnUse" x="0" y="0" width="625" height="665">
        <rect width="625" height="665" fill="white"/>
        <path d="M0 0 H625 V270 H480 L455 327 C415 340 379 360 346 380 C310 400 279 420 248 435 H0 Z" fill="black"/>
      </mask>
      <text id="${uid}-number" class="founder-experience-number" x="0" y="0">12</text>
      <text id="${uid}-caption" class="founder-experience-caption" x="0" y="0">${t('ANOS DE EXPERIÊNCIA')}</text>
    </defs>
    <g class="founder-experience-solid-layer founder-experience-filled" aria-hidden="true">
      <use href="#${uid}-number"/>
      <use href="#${uid}-caption"/>
    </g>
    <image href="${portraitSource()}" x="126" y="30" width="480" height="617.777778" preserveAspectRatio="xMidYMid meet"/>
    <g class="founder-experience-outline-layer" aria-hidden="true">
      <g mask="url(#${uid}-outline-guard)"><use class="founder-experience-outline" href="#${uid}-number"/></g>
      <use class="founder-experience-caption-outline" href="#${uid}-caption"/>
    </g>
  </svg>`;
  const number=host.querySelector('.founder-experience-number'),title=host.querySelector('title'),caption=host.querySelector('.founder-experience-caption');
  const updatePortrait=()=>host.querySelector('image').setAttribute('href',portraitSource());
  mobileImage.addEventListener('change',updatePortrait);
  const measure=document.createElement('canvas').getContext('2d');
  measure.font='800 600px "Sora"';measure.letterSpacing='-20px';
  let destroyed=false,ready=false,last='',target=12,captionMetrics=null;
  function paint(value){
    const text=String(value).padStart(2,'0');if(text===last)return;last=text;
    number.textContent=text;number.removeAttribute('transform');
    const m=measure.measureText(text),width=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    if(!width||!height)return;
    const s=Math.min(595/width,448/height);
    number.setAttribute('transform',`translate(${30+(595-width*s)/2+m.actualBoundingBoxLeft*s} ${66+(448-height*s)/2+m.actualBoundingBoxAscent*s}) scale(${s})`);
    if(captionMetrics){
      const captionScale=width*s/(captionMetrics.actualBoundingBoxLeft+captionMetrics.actualBoundingBoxRight);
      caption.setAttribute('transform',`translate(${30+(595-width*s)/2+captionMetrics.actualBoundingBoxLeft*captionScale} 565) scale(${captionScale})`);
    }
    host.dataset.experienceCurrent=text;
  }
  function setValue(value){
    const parsed=Number(value);if(!Number.isInteger(parsed)||parsed<0||parsed>9999)throw new RangeError('Experience must be an integer from 0 to 9999');
    target=parsed;host.dataset.experienceYears=String(target);title.textContent=({pt:`Retrato do fundador. ${target} anos de experiência.`,en:`Founder portrait. ${target} years of experience.`,es:`Retrato del fundador. ${target} años de experiencia.`,zh:`创始人肖像，拥有 ${target} 年专业经验。`,fr:`Portrait du fondateur. ${target} ans d’expérience.`,'pt-PT':`Retrato do fundador. ${target} anos de experiência.`})[getLanguage()];
    last='';if(!ready)return;
    paint(target);host.dataset.experienceState='completed';
  }
  const api={setValue,destroy(){destroyed=true;mobileImage.removeEventListener('change',updatePortrait);delete host.founderExperience;}};
  host.founderExperience=api;target=Number(host.dataset.experienceYears||12);
  Promise.all([document.fonts.load('800 600px "Sora"'),document.fonts.ready]).then(()=>{
    if(destroyed)return;ready=true;
    measure.save();measure.font='800 42px "Sora"';measure.letterSpacing='-1px';captionMetrics=measure.measureText(caption.textContent);measure.restore();
    setValue(target);
  });
  return api;
}
