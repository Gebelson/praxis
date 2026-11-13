import { initCarouselSnap } from './carouselSnap.js';
import { initCarouselDots } from './carouselDots.js';
/**
 * PRAXIS — Carrossel 3D Coverflow (Seção 3: Portfólio)
 *
 * Componentes reutilizáveis:
 * - `CarouselSlide(slideData, index)`: cria o contêiner HTML real de cada slide
 *   com moldura externa fina e escura, cantos arredondados, borda interna,
 *   área de imagem com `overflow: hidden` e `object-fit: cover` e estado
 *   neutro reservado quando nenhuma imagem estiver definida.
 * - `ProjectCarousel(containerEl, slidesData)`: gerencia a cena 3D Coverflow
 *   com rotação física no eixo Y (`perspective`, `translate3d`, `rotateY`, `scale`),
 *   desfoque progressivo nos slides laterais, navegação circular infinita,
 *   botões laterais circulares com `backdrop-filter`, indicadores inferiores,
 *   arraste por mouse (`pointerdown`/`pointermove`), swipe touch no mobile e
 *   navegação por teclado (`ArrowLeft` / `ArrowRight`).
 *
 * Como adicionar imagens futuramente:
 * Basta preencher a propriedade `image` (caminho/URL) de qualquer item em
 * `CAROUSEL_SLIDES_DATA` abaixo, ou chamar em tempo de execução:
 *   `window.PraxisProjectCarousel.setSlideImage('carousel-slide-01', '/assets/meu-projeto.jpg', 'Descrição')`
 */

export const CAROUSEL_SLIDES_DATA = [
  {
    id: 'carousel-slide-01',
    name: 'Projeto em Destaque 01',
    image: null,
    alt: 'Projeto em Destaque 01 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-02',
    name: 'Projeto em Destaque 02',
    image: null,
    alt: 'Projeto em Destaque 02 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-03',
    name: 'Projeto em Destaque 03',
    image: null,
    alt: 'Projeto em Destaque 03 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-04',
    name: 'Projeto em Destaque 04',
    image: null,
    alt: 'Projeto em Destaque 04 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-05',
    name: 'Projeto em Destaque 05',
    image: null,
    alt: 'Projeto em Destaque 05 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-06',
    name: 'Projeto em Destaque 06',
    image: null,
    alt: 'Projeto em Destaque 06 — Portfólio PRAXIS',
    link: null,
  },
  {
    id: 'carousel-slide-07',
    name: 'Projeto em Destaque 07',
    image: null,
    alt: 'Projeto em Destaque 07 — Portfólio PRAXIS',
    link: null,
  },
];

/**
 * Componente reutilizável `CarouselSlide`.
 * Cria um slide real com moldura externa fina e escura, cantos arredondados,
 * espaçamento interno e viewport com `overflow: hidden` preparado para imagem.
 *
 * @param {Object} slideData - Dados do slide (`id`, `name`, `image`, `alt`, `link`)
 * @param {number} index - Índice numérico do slide (0..N-1)
 * @returns {HTMLElement} Elemento `<article class="carousel-slide">`
 */
export function CarouselSlide(slideData, index) {
  const slideEl = document.createElement('article');
  slideEl.className = 'carousel-slide';
  slideEl.id = slideData.id;
  slideEl.dataset.slideId = slideData.id;
  slideEl.dataset.slideIndex = String(index);
  slideEl.setAttribute('role', 'group');
  slideEl.setAttribute('aria-roledescription', 'slide');
  slideEl.setAttribute('aria-label', `${index + 1} de ${CAROUSEL_SLIDES_DATA.length}: ${slideData.name}`);

  const frameEl = document.createElement('div');
  frameEl.className = 'carousel-slide__frame glass-project-frame';

  const viewportEl = document.createElement('div');
  viewportEl.className = 'carousel-slide__viewport';

  const imgEl = document.createElement('img');
  imgEl.className = 'carousel-slide__image';
  imgEl.alt = slideData.alt || slideData.name || '';
  imgEl.loading = 'lazy';
  imgEl.decoding = 'async';
  imgEl.draggable = false;

  if (slideData.image) {
    imgEl.src = slideData.image;
    slideEl.classList.add('has-image');
  } else {
    imgEl.hidden = true;
    slideEl.classList.add('is-placeholder');
  }

  viewportEl.appendChild(imgEl);
  frameEl.appendChild(viewportEl);
  slideEl.appendChild(frameEl);

  return slideEl;
}

/**
 * Calcula a menor distância circular assinada entre `slideIndex` e `activeIndex`.
 * Exemplo com 7 slides: se `activeIndex = 0` e `slideIndex = 6`, retorna `-1` (vizinho à esquerda).
 *
 * @param {number} slideIndex
 * @param {number} activeIndex
 * @param {number} total
 * @returns {number} Offset circular assinado
 */
function getCircularOffset(slideIndex, activeIndex, total) {
  let diff = (slideIndex - activeIndex) % total;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

/**
 * Componente reutilizável `ProjectCarousel`.
 * Monta os slides 3D Coverflow, gerencia transformações tridimensionais e
 * sincroniza controles (setas, indicadores, drag, touch swipe e teclado).
 *
 * @param {HTMLElement} containerEl - Contêiner `.portfolio-carousel`
 * @param {Array} slidesData - Lista de dados dos slides
 * @returns {Object|null} API pública do carrossel
 */
export function ProjectCarousel(containerEl, slidesData = CAROUSEL_SLIDES_DATA) {
  if (!containerEl || !Array.isArray(slidesData) || slidesData.length === 0) {
    return null;
  }

  const stageEl = containerEl.querySelector('#carousel3dStage');
  const prevBtn = containerEl.querySelector('#carouselPrev');
  const nextBtn = containerEl.querySelector('#carouselNext');
  const dotsContainer = containerEl.querySelector('#carouselDots');

  if (!stageEl) return null;

  stageEl.innerHTML = '';
  if (dotsContainer) dotsContainer.innerHTML = '';

  const total = slidesData.length;
  let activeIndex = 0;

  // 1. Cria os slides reais com CarouselSlide
  const slideElements = slidesData.map((item, idx) => {
    const el = CarouselSlide(item, idx);
    stageEl.appendChild(el);
    return el;
  });

  // 2. Cria os indicadores inferiores sincronizados
  const dotElements = slidesData.map((item, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Ir para slide ${idx + 1}`);
    dot.dataset.slide = String(idx);
    dot.addEventListener('click', () => {
      goTo(idx);
    });
    if (dotsContainer) {
      dotsContainer.appendChild(dot);
    }
    return dot;
  });

  initCarouselDots(containerEl,dotsContainer);

  /**
   * Calcula os parâmetros 3D Coverflow para um determinado offset circular,
   * adaptando-se proporcionalmente em telas menores.
   *
   * @param {number} offset - Offset circular relativo ao slide central (ex.: -2, -1, 0, +1, +2)
   * @param {number} dragRatio - Fração contínua de arraste (-1..+1) durante interação de ponteiro
   */
  function applySlideTransform(slideEl, offset, dragRatio = 0) {
    const effectiveOffset = offset + dragRatio;
    const absOffset = Math.abs(effectiveOffset);
    const sign = effectiveOffset === 0 ? 0 : effectiveOffset > 0 ? 1 : -1;

    const isCompactViewport = window.innerWidth <= 1024;
    const baseTranslateX = isCompactViewport ? 48 : 515; // % em mobile/tablet, px em desktop 1440
    const farTranslateX = isCompactViewport ? 72 : 790;

    let translateXUnit = isCompactViewport ? '%' : 'px';
    let translateX = 0;
    let translateZ = 0;
    let rotateY = 0;
    let scale = 1;
    let blurPx = 0;
    let opacity = 1;
    let zIndex = 5;

    if (absOffset <= 1) {
      // Interpolação suave entre o slide central (0) e os slides laterais imediatos (±1)
      const t = absOffset;
      translateX = sign * baseTranslateX * t;
      translateZ = -240 * t;
      rotateY = -sign * 12 * t;
      scale = 1 - (1 - 0.94) * t;
      blurPx = 4.2 * t;
      opacity = 1 - (1 - 0.94) * t;
      zIndex = t < 0.5 ? 5 : 3;
    } else if (absOffset <= 2) {
      // Interpolação entre os slides laterais (±1) e os slides recuados (±2)
      const t = absOffset - 1;
      translateX = sign * (baseTranslateX + (farTranslateX - baseTranslateX) * t);
      translateZ = -240 - 240 * t;
      rotateY = -sign * (12 + 16 * t);
      scale = 0.94 - (0.94 - 0.84) * t;
      blurPx = 4.2 + 4.0 * t;
      opacity = 0.94 * (1 - t);
      zIndex = 2;
    } else {
      // Slides além de ±2 permanecem ocultos ao fundo para transição circular limpa
      translateX = sign * farTranslateX;
      translateZ = -480;
      rotateY = -sign * 28;
      scale = 0.82;
      blurPx = 8.5;
      opacity = 0;
      zIndex = 1;
    }

    slideEl.style.transform = `translate3d(${translateX.toFixed(2)}${translateXUnit}, 0px, ${translateZ.toFixed(1)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    slideEl.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
    slideEl.style.opacity = opacity.toFixed(3);
    slideEl.style.zIndex = String(zIndex);
  }

  /**
   * Atualiza o estado visual, atributos de acessibilidade e transformações 3D de todos os slides.
   *
   * @param {number} dragRatio - Deslocamento contínuo opcional durante arraste (-0.45 .. +0.45)
   */
  function render(dragRatio = 0) {
    slideElements.forEach((slideEl, idx) => {
      const offset = getCircularOffset(idx, activeIndex, total);
      const isCenter = offset === 0;
      const isPrev = offset === -1;
      const isNext = offset === 1;
      const isHidden = Math.abs(offset) > 1;

      slideEl.dataset.offset = String(offset);
      slideEl.classList.toggle('is-active', isCenter);
      slideEl.classList.toggle('is-prev', isPrev);
      slideEl.classList.toggle('is-next', isNext);
      slideEl.classList.toggle('is-far', isHidden);

      slideEl.setAttribute('aria-hidden', String(!isCenter));
      slideEl.tabIndex = isCenter ? 0 : -1;

      applySlideTransform(slideEl, offset, dragRatio);
    });

    dotElements.forEach((dotEl, idx) => {
      const isSelected = idx === activeIndex;
      dotEl.classList.toggle('is-active', isSelected);
      dotEl.setAttribute('aria-selected', String(isSelected));
      dotEl.tabIndex = isSelected ? 0 : -1;
    });

    containerEl.dataset.activeSlide = String(activeIndex);
  }

  /**
   * Navega para um índice específico com suporte circular (wrap-around).
   *
   * @param {number} targetIndex
   */
  function goTo(targetIndex) {
    activeIndex = ((targetIndex % total) + total) % total;
    render(0);
  }

  function next() {
    goTo(activeIndex + 1);
  }

  function prev() {
    goTo(activeIndex - 1);
  }

  // 3. Eventos dos botões de seta
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prev();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      next();
    });
  }

  // Clicar em um slide lateral visível (±1) avança ou retrocede diretamente para ele
  slideElements.forEach((slideEl, idx) => {
    slideEl.addEventListener('click', () => {
      if ( suppressClickAfterDrag ) return;
      const offset = getCircularOffset(idx, activeIndex, total);
      if (offset === -1){prev();}
      else if (offset === 1){next();}
    });
  });

  // 4. Navegação por teclado (ArrowLeft / ArrowRight) quando o carrossel contém o foco
  function onNavigationKey(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  }
  containerEl.addEventListener('keydown',onNavigationKey);
  dotsContainer?.addEventListener('keydown',onNavigationKey);

  // 5. Arraste com mouse (pointer/mouse) e swipe touch em dispositivos móveis
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let isHorizontalGesture = null;
  let suppressClickAfterDrag = false;
  const SWIPE_THRESHOLD = 42;

  function onDragStart(clientX, clientY) {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    deltaX = 0;
    isHorizontalGesture = null;
    suppressClickAfterDrag = false;
    stageEl.classList.add('is-dragging');
  }

  function onDragMove(clientX, clientY, eventObj) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (isHorizontalGesture === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontalGesture = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontalGesture === false) {
      // Permite rolagem vertical normal da página no touch
      isDragging = false;
      stageEl.classList.remove('is-dragging');
      render(0);
      return;
    }

    if (isHorizontalGesture && eventObj && eventObj.cancelable) {
      eventObj.preventDefault();
    }

    deltaX = dx;
    if (Math.abs(deltaX) > 10) {
      suppressClickAfterDrag = true;
    }

    const dragRatio = Math.max(-0.45, Math.min(0.45, deltaX / 480));
    render(dragRatio);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    stageEl.classList.remove('is-dragging');

    if (deltaX <= -SWIPE_THRESHOLD) {
      next();
    } else if (deltaX >= SWIPE_THRESHOLD) {
      prev();
    } else {
      render(0);
    }

    setTimeout(() => {
      suppressClickAfterDrag = false;
    }, 60);
  }

  // Eventos de Mouse
  stageEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onDragStart(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    onDragMove(e.clientX, e.clientY, e);
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    onDragEnd();
  });

  // Eventos Touch (Mobile/Tablet)
  stageEl.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );

  stageEl.addEventListener(
    'touchmove',
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
    },
    { passive: false }
  );

  stageEl.addEventListener('touchend', () => {
    onDragEnd();
  });

  stageEl.addEventListener('touchcancel', () => {
    if (!isDragging) return;
    isDragging = false;
    stageEl.classList.remove('is-dragging');
    render(0);
  });

  // Atualiza geometria caso o viewport mude entre desktop e mobile/tablet
  window.addEventListener('resize', () => {
    render(0);
  });

  /**
   * Permite vincular ou substituir a imagem de um slide futuramente por ID.
   */
  function setSlideImage(slideId, imageUrl, altText) {
    const idx = slidesData.findIndex((s) => s.id === slideId);
    if (idx === -1) return false;

    slidesData[idx].image = imageUrl;
    if (altText) slidesData[idx].alt = altText;

    const slideEl = slideElements[idx];
    const imgEl = slideEl.querySelector('.carousel-slide__image');
    if (!imgEl) return false;

    if (imageUrl) {
      imgEl.src = imageUrl;
      if (altText) imgEl.alt = altText;
      imgEl.hidden = false;
      slideEl.classList.add('has-image');
      slideEl.classList.remove('is-placeholder');
    } else {
      imgEl.removeAttribute('src');
      imgEl.hidden = true;
      slideEl.classList.remove('has-image');
      slideEl.classList.add('is-placeholder');
    }
    return true;
  }

  // Renderização inicial no slide 0
  render(0);
  initCarouselSnap(containerEl);

  const api = {
    next,
    prev,
    goTo,
    getActiveIndex: () => activeIndex,
    getTotalSlides: () => total,
    setSlideImage,
    slidesData,
  };

  window.PraxisProjectCarousel = api;
  return api;
}
