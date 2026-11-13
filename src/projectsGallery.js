/** PRAXIS project wall: automatic seamless motion, preserving card geometry and glass. */
import { gsap } from 'gsap';

export const PROJECTS_GALLERY_DATA = {
  config: {
    cardStep: 387, // passo horizontal entre cards na mesma fileira (px)
    stageDesignWidth: 1440,
    topRightOverhangReserve: 255, // reserva de borda cortada à direita no fim do curso da fileira superior (px)
    bottomLeftOverhangReserve: 43, // reserva de borda cortada à esquerda no fim do curso da fileira inferior (px)
    defaultSpeed: 30, // velocidade contínua em pixels de referência por segundo
  },
  // Fileira superior: movimento automático contínuo para a esquerda.
  // A sequência completa é repetida à direita para manter a emenda contínua.
  topRow: [
    { id: 'project-top-01', row: 'top', slot: 1, x: -221, width: 368, image: null, alt: '' },
    { id: 'project-top-02', row: 'top', slot: 2, x: 166,  width: 368, image: null, alt: '' },
    { id: 'project-top-03', row: 'top', slot: 3, x: 553,  width: 368, image: null, alt: '' },
    { id: 'project-top-04', row: 'top', slot: 4, x: 940,  width: 368, image: null, alt: '' },
    { id: 'project-top-05', row: 'top', slot: 5, x: 1327, width: 368, image: null, alt: '' },
    { id: 'project-top-06', row: 'top', slot: 6, x: 1714, width: 368, image: null, alt: '' },
    { id: 'project-top-07', row: 'top', slot: 7, x: 2101, width: 368, image: null, alt: '' },
    { id: 'project-top-08', row: 'top', slot: 8, x: 2488, width: 368, image: null, alt: '' },
  ],
  // Fileira inferior: movimento automático contínuo para a direita.
  // Cards adicionais à esquerda (x < -43, mantendo o passo de 387px e o desalinhamento de 178px)
  // preservam o deslocamento original entre as duas fileiras.
  bottomRow: [
    { id: 'project-bottom-01', row: 'bottom', slot: 1, x: -1204, width: 372, image: null, alt: '' },
    { id: 'project-bottom-02', row: 'bottom', slot: 2, x: -817,  width: 372, image: null, alt: '' },
    { id: 'project-bottom-03', row: 'bottom', slot: 3, x: -430,  width: 372, image: null, alt: '' },
    { id: 'project-bottom-04', row: 'bottom', slot: 4, x: -43,   width: 372, image: null, alt: '' },
    { id: 'project-bottom-05', row: 'bottom', slot: 5, x: 344,   width: 372, image: null, alt: '' },
    { id: 'project-bottom-06', row: 'bottom', slot: 6, x: 731,   width: 372, image: null, alt: '' },
    { id: 'project-bottom-07', row: 'bottom', slot: 7, x: 1118,  width: 372, image: null, alt: '' },
    { id: 'project-bottom-08', row: 'bottom', slot: 8, x: 1505,  width: 372, image: null, alt: '' },
  ],
};

/**
 * Componente reutilizável `ProjectCard`.
 * Cria a estrutura DOM de um card separando o posicionamento horizontal (`--card-x`)
 * no `<article class="project-card">` da transformação 3D em `.project-card__bezel`.
 *
 * @param {Object} cardProps Propriedades do card (`id`, row, slot, x, width, image, alt)
 * @returns {HTMLElement} Elemento `<article class="project-card">`
 */
export function ProjectCard(cardProps) {
  const { id, row, slot, x = 0, image = null, alt = '' } = cardProps;

  const article = document.createElement('article');
  article.className = `project-card project-card--${row}`;
  article.id = `card-${id}`;
  article.setAttribute('data-project-id', id);
  article.setAttribute('data-row', row);
  article.setAttribute('data-slot', String(slot));
  article.style.setProperty('--card-x', `${x}px`);

  const bezel = document.createElement('div');
  bezel.className = 'project-card__bezel glass-project-frame';

  const viewport = document.createElement('div');
  viewport.className = 'project-card__viewport';
  viewport.setAttribute('data-has-image', image ? 'true' : 'false');

  const img = document.createElement('img');
  img.className = 'project-card__image';
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (image) {
    img.src = image;
  } else {
    img.hidden = true;
  }

  viewport.appendChild(img);
  bezel.appendChild(viewport);
  article.appendChild(bezel);

  return article;
}

/** Continuous, opposing project rows. Scroll only determines viewport visibility. */
export function ProjectsGallery(container, galleryData = PROJECTS_GALLERY_DATA, options = {}) {
  if(!container)return null;
  container.projectsGallery?.destroy();container.replaceChildren();
  const stage=document.createElement('div');stage.className='projects-gallery__stage';
  const step=galleryData.config.cardStep||387;
  const rows=['top','bottom'].map((name,index)=>{
    const cards=galleryData[`${name}Row`],period=cards.length*step;
    const plane=document.createElement('div');plane.className=`projects-gallery__row-plane projects-gallery__row-plane--${name}`;
    const track=document.createElement('div');track.className=`projects-gallery__row-track projects-gallery__row-track--${name}`;
    track.id=index?'projectsGalleryTrackBottom':'projectsGalleryTrackTop';
    // One extra copy enters from the destination side of the moving track.
    for(const copy of [0,index?-1:1])for(const card of cards){
      const element=ProjectCard({...card,x:card.x+copy*period});
      if(copy){element.id+='--loop';element.dataset.loopCopy='true';element.setAttribute('aria-hidden','true');element.querySelector('img').alt='';}
      track.append(element);
    }
    plane.append(track);stage.append(plane);return {name,cards,track,plane,period,direction:index?1:-1};
  });
  container.append(stage);container.dataset.galleryMotion='automatic';
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const speed=Number.isFinite(options.speed)&&options.speed>0?options.speed:galleryData.config.defaultSpeed||30;
  let timeline=null,visible=false,destroyed=false;
  function refreshPlayback(){
    if(destroyed)return;
    if(motion.matches){
      timeline?.pause(0);container.dataset.galleryState='static';return;
    }
    const playing=visible&&!document.hidden;
    if(playing)timeline?.play();else timeline?.pause();
    container.dataset.galleryState=playing?'running':'paused';
  }
  // Shared repeating timeline: at the seam each copy occupies its original's position.
  timeline=gsap.timeline({paused:true,repeat:-1});
  const period=Math.max(...rows.map(row=>row.period));
  rows.forEach(row=>timeline.fromTo(row.track,{x:0},{x:row.direction*row.period,duration:period/speed,ease:'none',force3D:true,immediateRender:true},0));
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refreshPlayback();});
  observer.observe(container);motion.addEventListener('change',refreshPlayback);
  document.addEventListener('visibilitychange',refreshPlayback);refreshPlayback();
  function setCardImage(projectId,imageUrl,altText=''){
    const elements=container.querySelectorAll(`[data-project-id="${CSS.escape(projectId)}"]`);
    elements.forEach(element=>{
      const image=element.querySelector('.project-card__image'),viewport=element.querySelector('.project-card__viewport');
      if(imageUrl){image.src=imageUrl;image.alt=element.dataset.loopCopy?'':altText;image.hidden=false;}
      else{image.removeAttribute('src');image.alt='';image.hidden=true;}
      viewport.dataset.hasImage=String(Boolean(imageUrl));
    });
    return elements.length>0;
  }
  const api={
    container,topTrack:rows[0].track,bottomTrack:rows[1].track,data:galleryData,
    getProgress:()=>timeline?.progress()||0,
    getMetrics:()=>({visibleStageWidth:stage.offsetWidth,topPeriod:rows[0].period,bottomPeriod:rows[1].period,speed}),
    getScrollBounds:()=>{const r=container.getBoundingClientRect();return {scrollStart:scrollY+r.top-innerHeight,scrollEnd:scrollY+r.bottom};},
    setProgress:progress=>timeline?.progress(Math.max(0,Math.min(1,progress))),
    setCardImage,update:refreshPlayback,recalculate:refreshPlayback,timeline:()=>timeline,
    destroy(){
      destroyed=true;observer.disconnect();motion.removeEventListener('change',refreshPlayback);
      document.removeEventListener('visibilitychange',refreshPlayback);timeline?.kill();timeline=null;
      delete container.projectsGallery;
      if(window.PraxisProjectsGallery===api)delete window.PraxisProjectsGallery;
    },
  };
  container.projectsGallery=api;window.PraxisProjectsGallery=api;return api;
}
