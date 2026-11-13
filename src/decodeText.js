/**
 * PRAXIS — Utilitário Reutilizável de Animação de Decodificação ("Text Scramble / Decode")
 *
 * Recursos:
 * - Revelação progressiva da esquerda para a direita (left-to-right)
 * - Disparo único ao entrar na viewport via IntersectionObserver
 * - Preservação de espaços e delimitadores para evitar saltos de layout
 * - Controle de taxa de atualização (fps) para evitar flicker excessivo
 * - Respeito integral a `prefers-reduced-motion: reduce` e leitores de tela (`aria-label`)
 */

export const DECODE_DEFAULTS = {
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+-=*#%&',
  duration: 1800, // duração da decodificação em ms (mais cadenciada e visível)
  delay: 0, // atraso inicial em ms
  stagger: 160, // atraso automático entre itens de um grupo (se data-decode-delay não for definido)
  fps: 18, // trocas de caracteres aleatórios por segundo (~55ms por tick, leitura confortável)
  preserveChars: ' |\n\r\t.,:;!?-()', // caracteres estruturais que não embaralham
  threshold: 0.15, // porcentagem visível para acionar o IntersectionObserver
};

/**
 *Verifica se o usuário possui preferência de movimento reduzido ativa no sistema.
 */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Executa a animação de decodificação da esquerda para a direita em um elemento HTML.
 *
 * @param {HTMLElement} element Elemento alvo contendo o texto
 * @param {Partial<typeof DECODE_DEFAULTS>} options Opções de velocidade, delay e charset
 * @returns {() => void} Função de cancelamento (cleanup)
 */
export function decodeText(element, options = {}) {
  if (!element) return () => {};

  const targetText =
    element.getAttribute('data-decode-target') ?? element.textContent ?? '';
  element.setAttribute('data-decode-target', targetText);

  // Garante leitura limpa do texto final para tecnologias assistivas
  if (!element.hasAttribute('aria-label') && targetText.trim()) {
    element.setAttribute('aria-label', targetText.trim());
  }

  // Respeita acessibilidade (prefers-reduced-motion)
  if (prefersReducedMotion()) {
    element.textContent = targetText;
    element.setAttribute('data-decode-state', 'done');
    return () => {};
  }

  const attrDuration = element.getAttribute('data-decode-duration');
  const attrDelay = element.getAttribute('data-decode-delay');
  const attrCharset = element.getAttribute('data-decode-charset');
  const attrFps = element.getAttribute('data-decode-fps');

  const duration = Number(
    options.duration ?? (attrDuration !== null ? attrDuration : DECODE_DEFAULTS.duration)
  );
  const delay = Number(
    options.delay ?? (attrDelay !== null ? attrDelay : DECODE_DEFAULTS.delay)
  );
  const charset =
    options.charset ?? (attrCharset || DECODE_DEFAULTS.charset);
  const fps = Number(
    options.fps ?? (attrFps !== null ? attrFps : DECODE_DEFAULTS.fps)
  );
  const preserveChars = options.preserveChars ?? DECODE_DEFAULTS.preserveChars;

  const chars = Array.from(targetText);
  const totalLen = chars.length;
  if (totalLen === 0) return () => {};

  // Índices que realmente participam do embaralhamento (ignora espaços e separadores)
  const animatableIndices = [];
  for (let i = 0; i < totalLen; i++) {
    if (!preserveChars.includes(chars[i])) {
      animatableIndices.push(i);
    }
  }

  const totalAnimatable = animatableIndices.length;
  if (totalAnimatable === 0) {
    element.textContent = targetText;
    element.setAttribute('data-decode-state', 'done');
    return () => {};
  }

  const frameInterval = 1000 / Math.max(1, fps);
  const randomPool = Array.from(charset);
  const currentScramble = new Array(totalLen);

  function pickRandomChar(originalChar) {
    if (randomPool.length === 0) return originalChar;
    return randomPool[Math.floor(Math.random() * randomPool.length)];
  }

  // Inicializa o buffer de caracteres aleatórios
  for (let i = 0; i < totalLen; i++) {
    currentScramble[i] = preserveChars.includes(chars[i])
      ? chars[i]
      : pickRandomChar(chars[i]);
  }

  let rafId = null;
  let startTime = null;
  let lastTickTime = -Infinity;

  element.setAttribute('data-decode-state', 'decoding');

  function renderFrame(now) {
    if (startTime === null) {
      startTime = now;
    }

    const totalElapsed = now - startTime;
    const decodeElapsed = Math.max(0, totalElapsed - delay);
    const rawProgress = duration > 0 ? Math.min(1, decodeElapsed / duration) : 1;

    if (totalElapsed >= delay && rawProgress >= 1) {
      element.textContent = targetText;
      element.setAttribute('data-decode-state', 'done');
      return;
    }

    // Progressão cadenciada da esquerda para a direita após o delay
    const easedProgress =
      totalElapsed < delay ? 0 : 1 - Math.pow(1 - rawProgress, 1.15);
    const resolvedAnimatableCount = Math.floor(easedProgress * totalAnimatable);
    const resolvedUpToIndex =
      resolvedAnimatableCount > 0
        ? animatableIndices[resolvedAnimatableCount - 1]
        : -1;

    // Atualiza os caracteres aleatórios na taxa controlada (fps) para evitar flicker
    if (now - lastTickTime >= frameInterval) {
      lastTickTime = now;
      for (let i = resolvedUpToIndex + 1; i < totalLen; i++) {
        if (!preserveChars.includes(chars[i])) {
          currentScramble[i] = pickRandomChar(chars[i]);
        }
      }

      let output = '';
      for (let i = 0; i < totalLen; i++) {
        if (i <= resolvedUpToIndex || preserveChars.includes(chars[i])) {
          output += chars[i];
        } else {
          output += currentScramble[i];
        }
      }
      element.textContent = output;
    }

    rafId = window.requestAnimationFrame(renderFrame);
  }

  rafId = window.requestAnimationFrame(renderFrame);

  return function cancelDecode() {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    element.textContent = targetText;
    element.setAttribute('data-decode-state', 'done');
  };
}

const activeCancels = new WeakMap();

/**
 * Inicializa o IntersectionObserver para disparar a decodificação toda vez
 * que cada grupo `[data-decode-group]` ou elemento `[data-decode-text]` sair de cena e voltar para a viewport.
 *
 * @param {Partial<typeof DECODE_DEFAULTS>} defaultOptions Opções padrão
 */
export function initDecodeTextObserver(defaultOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const config = { ...DECODE_DEFAULTS, ...defaultOptions };
  const groups = Array.from(document.querySelectorAll('[data-decode-group]'));
  const standaloneElements = Array.from(
    document.querySelectorAll('[data-decode-text]')
  ).filter((el) => !el.closest('[data-decode-group]'));

  // Pré-registra o texto original e aria-label em todos os elementos
  document.querySelectorAll('[data-decode-text]').forEach((el) => {
    const orig = el.getAttribute('data-decode-target') ?? el.textContent ?? '';
    el.setAttribute('data-decode-target', orig);
    if (!el.hasAttribute('aria-label') && orig.trim()) {
      el.setAttribute('aria-label', orig.trim());
    }
  });

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    document.querySelectorAll('[data-decode-text]').forEach((el) => {
      el.setAttribute('data-decode-state', 'done');
    });
    return;
  }

  function stopElementDecode(el) {
    const cancel = activeCancels.get(el);
    if (typeof cancel === 'function') {
      cancel();
      activeCancels.delete(el);
    }
    el.setAttribute('data-decode-state', 'idle');
  }

  function startElementDecode(el, opts) {
    stopElementDecode(el);
    const cancel = decodeText(el, opts);
    activeCancels.set(el, cancel);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target;

        if (!entry.isIntersecting) {
          // Quando sai de cena, cancela qualquer animação em andamento e prepara para reentrada
          if (target.hasAttribute('data-decode-group')) {
            target.querySelectorAll('[data-decode-text]').forEach(stopElementDecode);
          } else if (target.hasAttribute('data-decode-text')) {
            stopElementDecode(target);
          }
          return;
        }

        // Quando entra (ou reentra) em cena, dispara a animação de decodificação
        if (target.hasAttribute('data-decode-group')) {
          const items = Array.from(target.querySelectorAll('[data-decode-text]'));
          items.forEach((item, index) => {
            const hasExplicitDelay = item.hasAttribute('data-decode-delay');
            startElementDecode(item, {
              ...config,
              delay: hasExplicitDelay
                ? Number(item.getAttribute('data-decode-delay'))
                : index * config.stagger,
            });
          });
        } else if (target.hasAttribute('data-decode-text')) {
          startElementDecode(target, config);
        }
      });
    },
    { threshold: config.threshold }
  );

  groups.forEach((group) => observer.observe(group));
  standaloneElements.forEach((el) => observer.observe(el));

  return observer;
}

if (typeof window !== 'undefined') {
  window.PraxisDecodeText = {
    decodeText,
    initDecodeTextObserver,
    DECODE_DEFAULTS,
  };
}
