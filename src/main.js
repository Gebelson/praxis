import { initSiteEnding } from './siteEnding.js';
import { initMobileUx } from './mobileUx.js';
import { initValuePropSnap } from './valuePropSnap.js';
import { initFaqAccordion } from './faqAccordion.js';
import { initSectionNavigation } from './sectionNavigation.js';
import { initSectionAccents } from './sectionAccents.js';
import { initAffiliatesSnap } from './affiliatesSnap.js';
import { initTestimonialsAtmosphere } from './testimonialsAtmosphere.js';
import { initTestimonialInteraction } from './testimonialInteraction.js';
import { initPageScrollbar } from './pageScrollbar.js';
/**
 * PRAXIS — Interações do Site
 * - Seletor de idioma no header
 * - Carrossel de projetos do Portfólio (setas + indicadores)
 * - Seleção de faixa de orçamento e submissão do formulário de contato
 * - Acordeão interativo na seção de Perguntas Frequentes (FAQ)
 */

import { initFounderExperience } from './founderExperience.js';
import { initDecodeTextObserver } from './decodeText.js';
import { ProjectsGallery } from './projectsGallery.js';
import { ProjectCarousel } from './projectCarousel.js';
import {
  ClientsMarquee,
  BenefitsMarquee,
  initClientsDashedRuleMarquee,
  initAffiliatesDashedRuleMarquee,
} from './clientsSection.js';
import { initPraxisHero } from './components/PraxisHero/PraxisHero.js';
import { initProcessSection } from './processSection.js';
import { initTrustBadge } from './trustBadge.js';
import { initDevmodeCharts } from './devmodeCharts.js';
import { initBarcodeReveal } from './barcodeReveal.js';

import { initNavSectionDecode } from './navSectionDecode.js';
import { initNavMenuAnimation } from './navMenuAnimation.js';
import { initCtaBannerAnimation } from './ctaBannerAnimation.js';
import { initLangSelector } from './langSelector.js';


document.addEventListener('DOMContentLoaded', () => {
  initMobileUx();
  initSectionNavigation();
  initFounderExperience();
  // Inicializa o bloco de confiança (avatares e prova social)
  initTrustBadge();
  // Inicializa o bloco animado do Barcode (decodificação + transição glitch)
  initBarcodeReveal();

  // Inicializa animação de rotação orgânica dos símbolos '+' do menu

  initNavMenuAnimation();
  initNavSectionDecode();
  /* =========================================================================
     1. SELETOR DE IDIOMA REFINADO (ANIMAÇÃO + ACESSIBILIDADE)
     ========================================================================= */
  initLangSelector();
  initPageScrollbar();

  /* =========================================================================
     2. CARROSSEL 3D COVERFLOW DO PORTFÓLIO
     ========================================================================= */
  const projectCarouselEl = document.getElementById('projectCarousel');
  if (projectCarouselEl) {
    ProjectCarousel(projectCarouselEl);
  }

  /* =========================================================================
     3. FORMULÁRIO DE CONTATO / ORÇAMENTO
     ========================================================================= */
  const budgetPills = document.querySelectorAll('.budget-pill');
  const budgetHiddenInput = document.getElementById('inputOrcamento');
  const contactForm = document.getElementById('contactForm');
  const formFeedback = document.getElementById('formFeedback');

  budgetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      budgetPills.forEach((p) => p.classList.remove('is-selected'));
      pill.classList.add('is-selected');
      if (budgetHiddenInput) {
        budgetHiddenInput.value = pill.getAttribute('data-budget') || '';
      }
    });
  });

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (formFeedback) {
        formFeedback.textContent = 'Mensagem registrada localmente! (Envio aguarda integração de backend)';
        formFeedback.hidden = false;
      }
    });
  }

  /* =========================================================================
     4. ESCALA PROPORCIONAL FULL-WIDTH (SEM MARGENS LATERAIS EM DESKTOP)
     ========================================================================= */
  const siteWrapper = document.querySelector('.site-wrapper');

  function heroFlowHeight() {
    const hero=document.querySelector('#inicio.praxis-hero');
    return hero ? (hero.closest('.pin-spacer') || hero).offsetHeight : 0;
  }

  function updateViewportScale() {
    if (!siteWrapper) return;
    if (window.innerWidth <= 1024) {
      siteWrapper.style.transform = '';
      document.documentElement.style.setProperty('--header-scale', '1');
      siteWrapper.style.marginBottom = '';
      document.body.style.height = '';
      document.body.style.overflowY = '';
      return;
    }

    const clientWidth = document.documentElement.clientWidth || window.innerWidth;
    const scale = clientWidth / 1440;
    const headerScale = window.innerWidth > 1024 ? clientWidth / 1440 : 1;
    document.documentElement.style.setProperty('--header-scale', String(headerScale));
    if (Math.abs(scale - 1) < 0.0005) {
      siteWrapper.style.transform = '';
      siteWrapper.style.marginBottom = '';
      document.body.style.height = '';
      document.body.style.overflowY = '';
      return;
    }

    const unscaledHeight = siteWrapper.offsetHeight || 15761;
    siteWrapper.style.transformOrigin = '0 0';
    siteWrapper.style.transform = `scale(${scale})`;
    siteWrapper.style.marginBottom = `${unscaledHeight * (scale - 1)}px`;
    document.body.style.height = `${Math.round(unscaledHeight * scale + heroFlowHeight())}px`;
    document.body.style.overflowX = 'clip';
    document.body.style.overflowY = '';

    // Segunda passagem caso a barra de rolagem vertical altere clientWidth
    const finalClientWidth = document.documentElement.clientWidth || window.innerWidth;
    if (finalClientWidth !== clientWidth) {
      const finalScale = finalClientWidth / 1440;
      siteWrapper.style.transform = `scale(${finalScale})`;
      siteWrapper.style.marginBottom = `${unscaledHeight * (finalScale - 1)}px`;
      document.body.style.height = `${Math.round(unscaledHeight * finalScale + heroFlowHeight())}px`;
    }
  }

  /* =========================================================================
     5. ACORDEÃO DE PERGUNTAS FREQUENTES (FAQ)
     ========================================================================= */
  const faqCards = Array.from(document.querySelectorAll('.faq-card'));

  function updateFaqPositions() {
    faqCards.forEach((card) => {
      card.style.top = '';
    });
    updateViewportScale();
  }

  initFaqAccordion(document.getElementById('faq'),{onLayout:updateFaqPositions});

  window.addEventListener('resize', () => {
    updateFaqPositions();
    updateViewportScale();
  });
  window.addEventListener('load', updateViewportScale);
  window.addEventListener('praxis:hero-layout', updateViewportScale);
  window.addEventListener('praxis:page-layout', updateViewportScale);
  updateViewportScale();

  /* =========================================================================
     6. ANIMAÇÃO DE ROLAGEM VERTICAL DOS SIDE RAILS (HERO)
     - Esquerda (#heroRailLeft): move para BAIXO (+Y) conforme a página rola
     - Direita (#heroRailRight): move para CIMA (-Y) conforme a página rola
     ========================================================================= */
  const heroRailLeft = document.getElementById('heroRailLeft');
  const heroRailRight = document.getElementById('heroRailRight');
  const RAIL_PERIOD = 85.375;
  const RAIL_SCROLL_SPEED = 0.10;

  function updateHeroRailsScroll() {
    if (!heroRailLeft && !heroRailRight) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const shift = ((scrollY * RAIL_SCROLL_SPEED) % RAIL_PERIOD + RAIL_PERIOD) % RAIL_PERIOD;

    if (heroRailLeft) {
      heroRailLeft.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    }
    if (heroRailRight) {
      heroRailRight.style.transform = `translate3d(0, ${(-shift).toFixed(2)}px, 0)`;
    }
  }

  window.addEventListener('scroll', updateHeroRailsScroll, { passive: true });
  updateHeroRailsScroll();

  /* =========================================================================
     7. ANIMAÇÃO DE DECODIFICAÇÃO DE ENTRADA (INTERSECTION OBSERVER)
     ========================================================================= */
  initDecodeTextObserver();

  /* =========================================================================
     8. GALERIA DE PROJETOS COM LOOP HORIZONTAL AUTOMÁTICO
     ========================================================================= */
  const galleryContainer = document.getElementById('projectsGallery');
  if (galleryContainer) {
    ProjectsGallery(galleryContainer);
  }

  /* =========================================================================
     9. SEÇÃO DE CLIENTES: TRAÇADO PONTILHADO (MARQUEE DIREITA) + CLIENTS MARQUEE
     ========================================================================= */
  const clientsSection = document.getElementById('clientes');
  const clientsDashedRule = document.getElementById('clientsDashedRule');
  const clientsMarqueeEl = document.getElementById('clientsMarquee');

  if (clientsSection && clientsDashedRule) {
    initClientsDashedRuleMarquee(clientsSection, clientsDashedRule);
  }
  if (clientsMarqueeEl) {
    ClientsMarquee(clientsMarqueeEl);
  }

  /* =========================================================================
     9.1. SEÇÃO DE AFILIADOS: TRAÇADO PONTILHADO (DIREITA) + MARQUEE DE BENEFÍCIOS (ESQUERDA)
     ========================================================================= */
  const affiliatesSection = document.getElementById('afiliados');
  const affiliatesDashedRule = document.getElementById('affiliatesDashedRule');
  const affiliatesMarqueeEl = document.getElementById('affiliatesMarquee');

  if (affiliatesSection && affiliatesDashedRule) {
    initAffiliatesDashedRuleMarquee(affiliatesSection, affiliatesDashedRule);
  }
  if (affiliatesMarqueeEl) {
    BenefitsMarquee(affiliatesMarqueeEl);
  }
  /* =========================================================================
     10. RECONSTRUÇÃO DO MONITOR 3D ANIMADO (ESTILO DYLAN BROUWER)
     ========================================================================= */
  initPraxisHero();

  /* =========================================================================
     11. RECONSTRUÇÃO DA SEÇÃO PROCESS (ESTILO DIXIE RAIZ PACHECO)
     ========================================================================= */
  initProcessSection();

  /* =========================================================================
     12. ANIMAÇÃO DE ENTRADA DOS GRÁFICOS DEV MODE (CUSTO X TEMPO)
     ========================================================================= */
  initDevmodeCharts();

  /* =========================================================================
     13. ANIMAÇÃO DE ENTRADA DO BANNER CTA
     ========================================================================= */
  initCtaBannerAnimation();
  initTestimonialsAtmosphere();
  initTestimonialInteraction();
  initAffiliatesSnap();
  initSiteEnding();
  initValuePropSnap();
  initSectionAccents();

});
