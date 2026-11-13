/**
 * PRAXIS — Animação de Rotação Orgânica dos Símbolos '+' do Menu
 *
 * Baseado na referência aprovada (PRAXIS_menu_giro_180_195_centro_corrigido.html).
 * Executa uma rotação fluida com ultrapassagem orgânica:
 *   0° -> 180° (250 ms) -> 195° (80 ms) -> Pausa (55 ms) -> 180° (90 ms).
 * Duração total: 475 ms.
 * Ao sair do hover, retorna suavemente a 0° em 210 ms.
 * Interrupções durante a animação recuam suavemente a partir do ângulo atual sem saltos.
 * Respeita prefers-reduced-motion e navegação por teclado (focus/blur).
 */

export function initNavMenuAnimation() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 475;

  function angleOf(element) {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return 0;
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      let angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      if (angle < -90) angle += 360;
      return angle;
    } catch {
      return 0;
    }
  }

  function stop(element) {
    if (typeof element.getAnimations === 'function') {
      const a = element.getAnimations();
      a.forEach((animation) => animation.cancel());
    }
  }

  function enter(link) {
    if (reduced.matches || link.dataset.active === 'true') return;
    link.dataset.active = 'true';
    const glyph = link.querySelector('.nav-plus-icon');
    if (!glyph) return;

    const start = angleOf(glyph);
    stop(glyph);
    glyph.style.transform = `rotate(${start}deg)`;

    const anim = glyph.animate([
      { transform: `rotate(${start}deg)`, offset: 0, easing: 'cubic-bezier(.15,.55,.37,.98)' },
      { transform: 'rotate(180deg)', offset: 250 / duration, easing: 'cubic-bezier(.18,.7,.34,1)' },
      { transform: 'rotate(195deg)', offset: 330 / duration, easing: 'linear' },
      { transform: 'rotate(195deg)', offset: 385 / duration, easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: 'rotate(180deg)', offset: 1 }
    ], { duration, fill: 'forwards', iterations: 1 });

    anim.onfinish = () => {
      glyph.style.transform = 'rotate(180deg)';
      anim.cancel();
    };
  }

  function leave(link) {
    if (link.dataset.active !== 'true') return;
    link.dataset.active = 'false';
    const glyph = link.querySelector('.nav-plus-icon');
    if (!glyph) return;

    if (reduced.matches) {
      stop(glyph);
      glyph.style.transform = 'rotate(0deg)';
      return;
    }

    const current = angleOf(glyph);
    stop(glyph);
    glyph.style.transform = `rotate(${current}deg)`;

    const anim = glyph.animate([
      { transform: `rotate(${current}deg)`, easing: 'cubic-bezier(.25,.65,.32,1)' },
      { transform: 'rotate(0deg)' }
    ], { duration: 210, fill: 'forwards' });

    anim.onfinish = () => {
      glyph.style.transform = 'rotate(0deg)';
      anim.cancel();
    };
  }

  const links = document.querySelectorAll('.main-nav .nav-link');
  links.forEach((link) => {
    link.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') {
        enter(link);
      }
    });

    link.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') {
        leave(link);
      }
    });

    link.addEventListener('focus', () => enter(link));
    link.addEventListener('blur', () => leave(link));

    link.addEventListener('click', () => {
      if (reduced.matches) return;
      if (link.dataset.active !== 'true') enter(link);
    });
  });

  reduced.addEventListener('change', () => {
    links.forEach((link) => {
      leave(link);
      const glyph = link.querySelector('.nav-plus-icon');
      if (glyph) {
        stop(glyph);
        glyph.style.transform = 'rotate(0deg)';
      }
      link.dataset.active = 'false';
    });
  });
}
