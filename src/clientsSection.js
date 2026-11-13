/**
 * PRAXIS — Componentes Reutilizáveis de Faixa Infinita e Traçado Pontilhado
 *
 * 1. `InfiniteMarquee(containerEl, options)`:
 *    - Faixa horizontal infinita com deslocamento contínuo da direita para a esquerda.
 *    - Velocidade suave e constante, independente da rolagem.
 *    - Medição dinâmica (`ResizeObserver` + `document.fonts.ready`) para loop matemático
 *      perfeito sem saltos ou engasgos.
 *    - Conjuntos clonados marcados com `aria-hidden="true"` e `inert`.
 *
 * 2. `AnimatedDashedLine(sectionEl, ruleEl, options)`:
 *    - Traçado horizontal pontilhado contínuo que se move infinitamente para a DIREITA.
 *    - Segmentos duplicados alinhados ao período exato de 12px (7px traço + 5px espaço).
 *    - Pausa apenas quando fora da viewport (`IntersectionObserver`) sem reset de posição.
 *
 * 3. Especializações:
 *    - `ClientsMarquee`: faixa de clientes com suporte a logos futuras.
 *    - `BenefitsMarquee`: faixa de benefícios ("SEM INVESTIMENTO INICIAL", etc.).
 *    - `initClientsDashedRuleMarquee`: traçado no topo da seção de clientes.
 *    - `initAffiliatesDashedRuleMarquee`: traçado no topo da faixa de afiliados.
 */

export const CLIENTS_MARQUEE_DATA = [
  { id: 'client-01', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
  { id: 'client-02', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
  { id: 'client-03', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
  { id: 'client-04', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
  { id: 'client-05', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
  { id: 'client-06', name: 'Clientes', logo: null, alt: 'Clientes', link: null },
];

/**
 * Cria um item individual para a faixa de clientes
 */
function createMarqueeItem(itemData, isClone = false) {
  const itemEl = document.createElement('div');
  itemEl.className = 'clients-marquee__item';
  itemEl.dataset.clientId = itemData.id;

  const contentHost = itemData.link ? document.createElement('a') : document.createElement('span');
  if (itemData.link) {
    contentHost.className = 'clients-marquee__link';
    contentHost.href = itemData.link;
    contentHost.target = '_blank';
    contentHost.rel = 'noopener noreferrer';
    if (isClone) contentHost.tabIndex = -1;
  } else {
    contentHost.className = 'clients-marquee__content';
  }

  const imgEl = document.createElement('img');
  imgEl.className = 'clients-marquee__logo';
  imgEl.alt = isClone ? '' : itemData.alt || itemData.name || '';
  imgEl.loading = 'lazy';
  imgEl.decoding = 'async';
  imgEl.draggable = false;

  const textEl = document.createElement('span');
  textEl.className = 'clients-marquee__label';
  textEl.textContent = itemData.name || 'Clientes';

  if (itemData.logo) {
    imgEl.src = itemData.logo;
    textEl.hidden = true;
    itemEl.classList.add('has-logo');
  } else {
    imgEl.hidden = true;
    itemEl.classList.add('is-text');
  }

  contentHost.appendChild(imgEl);
  contentHost.appendChild(textEl);
  itemEl.appendChild(contentHost);

  return itemEl;
}

/**
 * Componente Genérico e Reutilizável de Marquee Infinito Horizontal (Direita -> Esquerda)
 *
 * @param {HTMLElement} containerEl - Contêiner do marquee
 * @param {Object} options - Opções de configuração
 * @returns {Object|null} API de controle e inspeção
 */
export function InfiniteMarquee(containerEl, options = {}) {
  if (!containerEl) return null;

  const speedPxPerSec = options.speedPxPerSec || 68;
  const totalGroups = options.totalGroups || 3;
  const trackClass = options.trackClass || 'infinite-marquee__track';
  const groupClass = options.groupClass || 'infinite-marquee__group';

  const renderItemFn = options.renderItem || null;
  const itemsData = options.data || null;

  let templateElements = [];
  if (!renderItemFn && !itemsData) {
    templateElements = Array.from(containerEl.children).map((el) => el.cloneNode(true));
  }

  containerEl.innerHTML = '';
  containerEl.removeAttribute('aria-hidden');
  containerEl.setAttribute('role', 'region');
  if (options.ariaLabel) {
    containerEl.setAttribute('aria-label', options.ariaLabel);
  }

  const trackEl = document.createElement('div');
  trackEl.className = trackClass;
  if (options.trackId) {
    trackEl.id = options.trackId;
  }

  const groups = [];
  for (let g = 0; g < totalGroups; g += 1) {
    const isClone = g > 0;
    const groupEl = document.createElement('div');
    groupEl.className = groupClass;
    groupEl.dataset.marqueeGroup = isClone ? `clone-${g}` : 'primary';

    if (isClone) {
      groupEl.setAttribute('aria-hidden', 'true');
      groupEl.setAttribute('inert', '');
    }

    if (renderItemFn && itemsData) {
      itemsData.forEach((itemData) => {
        groupEl.appendChild(renderItemFn(itemData, isClone));
      });
    } else {
      templateElements.forEach((tmpl) => {
        const itemEl = tmpl.cloneNode(true);
        if (isClone) {
          const interactive = itemEl.querySelectorAll('a, button, input');
          interactive.forEach((node) => node.setAttribute('tabindex', '-1'));
        }
        groupEl.appendChild(itemEl);
      });
    }

    trackEl.appendChild(groupEl);
    groups.push(groupEl);
  }

  containerEl.appendChild(trackEl);

  let measuredGroupWidth = 1440;
  let durationSec = measuredGroupWidth / speedPxPerSec;

  function updateMetrics() {
    const primaryGroup = groups[0];
    if (!primaryGroup) return measuredGroupWidth;

    const localWidth = primaryGroup.offsetWidth || primaryGroup.getBoundingClientRect().width || 1440;
    if (localWidth > 0) {
      measuredGroupWidth = localWidth;
      durationSec = measuredGroupWidth / speedPxPerSec;
      trackEl.style.setProperty('--marquee-group-width', `${measuredGroupWidth}px`);
      trackEl.style.setProperty('--marquee-duration', `${durationSec.toFixed(3)}s`);
      containerEl.dataset.groupWidth = String(measuredGroupWidth);
      containerEl.dataset.durationSec = durationSec.toFixed(3);
    }
    return measuredGroupWidth;
  }

  updateMetrics();

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      updateMetrics();
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      updateMetrics();
    });
    ro.observe(containerEl);
    ro.observe(groups[0]);
  } else {
    window.addEventListener('resize', updateMetrics, { passive: true });
  }

  if (typeof IntersectionObserver !== 'undefined' && options.pauseOffscreen !== false) {
    const observeTarget = options.sectionEl || containerEl;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === observeTarget) {
            trackEl.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
            containerEl.dataset.playState = entry.isIntersecting ? 'running' : 'paused';
          }
        });
      },
      { root: null, rootMargin: '150px 0px', threshold: 0 }
    );
    io.observe(observeTarget);
  }

  function getCurrentTranslateX() {
    const style = window.getComputedStyle(trackEl);
    const transform = style.transform || style.webkitTransform;
    if (!transform || transform === 'none') return 0;
    const match = transform.match(/matrix.*\((.+)\)/);
    if (!match) return 0;
    const values = match[1].split(',').map((v) => parseFloat(v.trim()));
    return values.length === 16 ? values[12] : values[4];
  }

  return {
    container: containerEl,
    track: trackEl,
    groups,
    getGroupWidth: () => measuredGroupWidth,
    getDurationSeconds: () => durationSec,
    getCurrentTranslateX,
    updateMetrics,
  };
}

/**
 * Componente Reutilizável de Traçado Pontilhado Animado (Esquerda -> Direita)
 *
 * @param {HTMLElement} sectionEl - Seção ancestral para controle de visibilidade
 * @param {HTMLElement} ruleEl - Elemento contêiner do traçado
 * @param {Object} options - Opções de velocidade e classes
 * @returns {Object|null} API de controle e inspeção
 */
export function AnimatedDashedLine(sectionEl, ruleEl, options = {}) {
  if (!sectionEl || !ruleEl) return null;

  const DASH_PERIOD = options.dashPeriod || 12; // 7px traço + 5px espaço
  const speedPxPerSec = options.speedPxPerSec || 37.5; // Mesma velocidade elegante da Seção de Clientes

  ruleEl.innerHTML = '';
  ruleEl.style.removeProperty('transform');

  const trackEl = document.createElement('div');
  trackEl.className = options.trackClass || 'dashed-rule-clients__track';
  if (options.trackId) {
    trackEl.id = options.trackId;
  }

  const segments = [];
  for (let i = 0; i < 2; i += 1) {
    const segEl = document.createElement('div');
    segEl.className = options.segmentClass || 'dashed-rule-clients__segment';
    segEl.dataset.segmentIndex = String(i);
    if (i > 0) {
      segEl.setAttribute('aria-hidden', 'true');
    }
    trackEl.appendChild(segEl);
    segments.push(segEl);
  }

  ruleEl.appendChild(trackEl);

  let segmentWidth = 1440;
  let durationSec = segmentWidth / speedPxPerSec;

  function updateMetrics() {
    const rawWidth =
      ruleEl.offsetWidth ||
      sectionEl.offsetWidth ||
      ruleEl.getBoundingClientRect().width ||
      1440;
    const snappedWidth = Math.max(
      DASH_PERIOD * 20,
      Math.ceil(rawWidth / DASH_PERIOD) * DASH_PERIOD
    );

    segmentWidth = snappedWidth;
    durationSec = segmentWidth / speedPxPerSec;

    trackEl.style.setProperty('--dash-segment-width', `${segmentWidth}px`);
    trackEl.style.setProperty('--dash-marquee-duration', `${durationSec.toFixed(3)}s`);
    ruleEl.dataset.segmentWidth = String(segmentWidth);
    ruleEl.dataset.durationSec = durationSec.toFixed(3);

    return segmentWidth;
  }

  updateMetrics();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      updateMetrics();
    });
    ro.observe(ruleEl);
    ro.observe(sectionEl);
  } else {
    window.addEventListener('resize', updateMetrics, { passive: true });
  }

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === sectionEl) {
            trackEl.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
            ruleEl.dataset.playState = entry.isIntersecting ? 'running' : 'paused';
          }
        });
      },
      { root: null, rootMargin: '150px 0px', threshold: 0 }
    );
    io.observe(sectionEl);
  }

  function getCurrentTranslateX() {
    const style = window.getComputedStyle(trackEl);
    const transform = style.transform || style.webkitTransform;
    if (!transform || transform === 'none') return 0;
    const match = transform.match(/matrix.*\((.+)\)/);
    if (!match) return 0;
    const values = match[1].split(',').map((v) => parseFloat(v.trim()));
    return values.length === 16 ? values[12] : values[4];
  }

  return {
    sectionEl,
    ruleEl,
    trackEl,
    segments,
    speedPxPerSec,
    getSegmentWidth: () => segmentWidth,
    getDurationSeconds: () => durationSec,
    getCurrentTranslateX,
    updateMetrics,
  };
}

/**
 * Especialização para a Faixa de Clientes
 */
export function ClientsMarquee(containerEl, clientsData = CLIENTS_MARQUEE_DATA, options = {}) {
  const marquee = InfiniteMarquee(containerEl, {
    data: clientsData,
    renderItem: createMarqueeItem,
    speedPxPerSec: options.speedPxPerSec || 68,
    ariaLabel: 'Faixa de Clientes',
    trackId: 'clientsMarqueeTrack',
    trackClass: 'clients-marquee__track',
    groupClass: 'clients-marquee__group',
    sectionEl: containerEl.closest('.sec-clients'),
  });

  if (!marquee) return null;

  function setClientLogo(clientId, logoUrl, altText, linkUrl = null) {
    const target = clientsData.find((c) => c.id === clientId);
    if (!target) return false;
    target.logo = logoUrl;
    if (altText) target.alt = altText;
    if (linkUrl !== undefined) target.link = linkUrl;

    const itemNodes = marquee.track.querySelectorAll(`[data-client-id="${clientId}"]`);
    itemNodes.forEach((node) => {
      const isClone = Boolean(node.closest('[aria-hidden="true"]'));
      const replacement = createMarqueeItem(target, isClone);
      node.replaceWith(replacement);
    });
    marquee.updateMetrics();
    return true;
  }

  const api = {
    ...marquee,
    clientsData,
    setClientLogo,
  };

  if (typeof window !== 'undefined') {
    window.PraxisClientsMarquee = api;
  }
  return api;
}

/**
 * Especialização para a Faixa de Benefícios ("SEM INVESTIMENTO INICIAL", etc.)
 */
export function BenefitsMarquee(containerEl, options = {}) {
  const marquee = InfiniteMarquee(containerEl, {
    speedPxPerSec: options.speedPxPerSec || 68, // Mesma velocidade constante da seção Clientes
    ariaLabel: 'Faixa de Benefícios do Afiliado',
    trackId: 'benefitsMarqueeTrack',
    trackClass: 'benefits-marquee__track',
    groupClass: 'benefits-marquee__group',
    sectionEl: containerEl.closest('.sec-affiliates'),
  });

  if (!marquee) return null;

  if (typeof window !== 'undefined') {
    window.PraxisBenefitsMarquee = marquee;
  }
  return marquee;
}

/**
 * Inicializa o traçado superior da Seção de Clientes
 */
export function initClientsDashedRuleMarquee(sectionEl, ruleEl, options = {}) {
  const api = AnimatedDashedLine(sectionEl, ruleEl, {
    ...options,
    trackId: 'clientsDashedRuleTrack',
  });
  if (typeof window !== 'undefined') {
    window.PraxisClientsDashedRule = api;
  }
  return api;
}

/**
 * Inicializa o traçado superior da Faixa de Benefícios do Afiliado
 */
export function initAffiliatesDashedRuleMarquee(sectionEl, ruleEl, options = {}) {
  const api = AnimatedDashedLine(sectionEl, ruleEl, {
    ...options,
    trackId: 'affiliatesDashedRuleTrack',
  });
  if (typeof window !== 'undefined') {
    window.PraxisAffiliatesDashedRule = api;
  }
  return api;
}

export const initClientsDashedRuleScroll = initClientsDashedRuleMarquee;
