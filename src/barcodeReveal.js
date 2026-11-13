/**
 * PRAXIS — Componente PraxisBarcodeReveal
 * Estética Brutalista Minimalista Monocromática de Baixa Intensidade
 *
 * Máquina de estados determinística:
 * IDLE → DECODING → RESOLVED → MORPHING → BARCODE → GLITCH → BARCODE
 *
 * Transições:
 * - IDLE → DECODING: componente entra na área visível (intersectionRatio > 0).
 * - DECODING → RESOLVED: texto totalmente decodificado (duração: 800ms).
 * - RESOLVED → MORPHING: breve pausa estática concluída (duração: 180ms).
 * - MORPHING → BARCODE: transformação concluída (duração: 280ms, cortes horizontais discretos).
 * - BARCODE → GLITCH: disparo periódico (intervalo: 5–9s, duração: 80–140ms).
 * - GLITCH → BARCODE: interferência concluída, retorno à imagem íntegra.
 * - QUALQUER ESTADO → IDLE: quando o componente sair completamente da área visível.
 *
 * Ao retornar para a viewport, a sequência reinicia sempre desde DECODING.
 * Acessibilidade: Respeita integralmente prefers-reduced-motion (exibe barcode estável direto).
 */

export const BARCODE_REVEAL_DEFAULTS = {
  text: 'PRAXIS NEW GENERATION',
  barcodeSrc: '/assets/barcode.png',
  barcodeAlt: 'Praxis New Generation Barcode',
  decodeDuration: 800,       // Duração total da decodificação (ms)
  decodeTickInterval: 40,    // Atualização dos caracteres a cada 35–45 ms (ms)
  pauseDuration: 180,        // Pausa com texto totalmente resolvido (ms)
  morphDuration: 280,        // Duração da transição discreta texto -> barcode (ms)
  minGlitchInterval: 5000,   // Intervalo mínimo entre glitches periódicos (ms)
  maxGlitchInterval: 9000,   // Intervalo máximo entre glitches periódicos (ms)
  minGlitchDuration: 80,     // Duração mínima do glitch periódico (ms)
  maxGlitchDuration: 140,    // Duração máxima do glitch periódico (ms)
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>[]+='
};

function checkPrefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export class PraxisBarcodeReveal {
  constructor(container, options = {}) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }

    if (!this.container) {
      console.warn('[PraxisBarcodeReveal] Container não encontrado.');
      return;
    }

    this.options = { ...BARCODE_REVEAL_DEFAULTS, ...options };
    this.state = 'IDLE'; // IDLE | DECODING | RESOLVED | MORPHING | BARCODE | GLITCH
    this.executionId = 0;
    this.isIntersecting = false;
    this.rafId = null;
    this.activeTimers = new Set();
    this.observer = null;

    this.initDOM();
    this.initObserver();

    if (typeof window !== 'undefined') {
      window.__praxisBarcodeReveal = this;
    }
  }

  initDOM() {
    this.container.classList.add('praxis-barcode-reveal');
    this.container.setAttribute('role', 'img');
    this.container.setAttribute('aria-label', this.options.barcodeAlt);
    this.container.setAttribute('data-state', 'IDLE');

    this.container.innerHTML = `
      <div class="barcode-reveal-stage">
        <!-- Camada de Texto com Decodificação -->
        <span class="barcode-reveal-text" aria-hidden="true"></span>

        <!-- Camada do Barcode Real -->
        <div class="barcode-reveal-img-wrap" aria-hidden="true">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>

        <!-- Camada de Slices para Transição e Glitch (Brutalismo Monocromático) -->
        <div class="barcode-reveal-slices-wrap" aria-hidden="true"></div>
      </div>
    `;

    this.textEl = this.container.querySelector('.barcode-reveal-text');
    this.imgWrap = this.container.querySelector('.barcode-reveal-img-wrap');
    this.slicesWrap = this.container.querySelector('.barcode-reveal-slices-wrap');

    if (checkPrefersReducedMotion()) {
      this.setReducedMotionState();
    } else {
      this.applyStateDOM('IDLE');
    }
  }

  setReducedMotionState() {
    this.state = 'BARCODE';
    this.container.setAttribute('data-state', 'BARCODE');
    this.container.classList.add('is-barcode', 'reduced-motion');
    if (this.textEl) this.textEl.style.display = 'none';
    if (this.imgWrap) this.imgWrap.style.opacity = '1';
    if (this.slicesWrap) this.slicesWrap.innerHTML = '';
  }

  setState(newState) {
    this.state = newState;
    this.container.setAttribute('data-state', newState);
    this.applyStateDOM(newState);
  }

  getState() {
    return this.state;
  }

  applyStateDOM(state) {
    this.container.classList.remove('is-idle', 'is-decoding', 'is-resolved', 'is-morphing', 'is-barcode', 'is-glitch');
    this.container.classList.add(`is-${state.toLowerCase()}`);

    if (state === 'IDLE') {
      if (this.textEl) {
        this.textEl.style.display = 'inline-block';
        this.textEl.style.opacity = '0';
        this.textEl.textContent = '';
      }
      if (this.imgWrap) {
        this.imgWrap.style.opacity = '0';
      }
      if (this.slicesWrap) {
        this.slicesWrap.innerHTML = '';
      }
    } else if (state === 'DECODING' || state === 'RESOLVED') {
      if (this.textEl) {
        this.textEl.style.display = 'inline-block';
        this.textEl.style.opacity = '1';
      }
      if (this.imgWrap) {
        this.imgWrap.style.opacity = '0';
      }
      if (this.slicesWrap) {
        this.slicesWrap.innerHTML = '';
      }
    } else if (state === 'MORPHING') {
      // Morphing usa as camadas de fatias temporárias
      if (this.textEl) {
        this.textEl.style.display = 'inline-block';
      }
    } else if (state === 'BARCODE') {
      if (this.textEl) {
        this.textEl.style.display = 'none';
      }
      if (this.imgWrap) {
        this.imgWrap.style.opacity = '1';
      }
      if (this.slicesWrap) {
        this.slicesWrap.innerHTML = '';
      }
    } else if (state === 'GLITCH') {
      if (this.textEl) {
        this.textEl.style.display = 'none';
      }
      if (this.imgWrap) {
        this.imgWrap.style.opacity = '1';
      }
    }
  }

  scheduleTimer(callback, delayMs, execId) {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      if (execId === this.executionId && this.isIntersecting) {
        callback();
      }
    }, delayMs);
    this.activeTimers.add(timer);
    return timer;
  }

  clearAllTimers() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const t of this.activeTimers) {
      clearTimeout(t);
      clearInterval(t);
    }
    this.activeTimers.clear();
  }

  initObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      this.isIntersecting = true;
      this.startSequence();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            this.isIntersecting = true;
            if (this.state === 'IDLE' && !checkPrefersReducedMotion()) {
              this.startSequence();
            }
          } else {
            this.isIntersecting = false;
            if (!checkPrefersReducedMotion()) {
              this.resetToIdle();
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.01]
      }
    );

    this.observer.observe(this.container);
  }

  startSequence() {
    if (checkPrefersReducedMotion()) return;
    const execId = ++this.executionId;
    this.clearAllTimers();

    this.setState('DECODING');
    this.runTextDecode(execId);
  }

  resetToIdle() {
    this.executionId++;
    this.clearAllTimers();
    this.setState('IDLE');
  }

  runTextDecode(execId) {
    const targetText = this.options.text;
    const chars = Array.from(targetText);
    const totalLen = chars.length;
    const pool = Array.from(this.options.charset);
    const duration = this.options.decodeDuration;
    const tickInterval = this.options.decodeTickInterval;

    const currentScramble = new Array(totalLen);
    for (let i = 0; i < totalLen; i++) {
      currentScramble[i] = chars[i] === ' ' ? ' ' : pool[Math.floor(Math.random() * pool.length)];
    }

    let startTime = null;
    let lastTick = -Infinity;

    const render = (now) => {
      if (execId !== this.executionId || !this.isIntersecting) return;

      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Resolução progressiva estrita da esquerda para a direita:
      // Caracteres resolvidos ficam trancados e não voltam a embaralhar.
      const resolvedCount = Math.floor(progress * totalLen);

      if (now - lastTick >= tickInterval) {
        lastTick = now;
        for (let i = resolvedCount; i < totalLen; i++) {
          if (chars[i] !== ' ') {
            currentScramble[i] = pool[Math.floor(Math.random() * pool.length)];
          }
        }

        let out = '';
        for (let i = 0; i < totalLen; i++) {
          if (i < resolvedCount || chars[i] === ' ') {
            out += chars[i];
          } else {
            out += currentScramble[i];
          }
        }
        if (this.textEl) this.textEl.textContent = out;
      }

      if (progress < 1) {
        this.rafId = requestAnimationFrame(render);
      } else {
        if (this.textEl) this.textEl.textContent = targetText;
        this.onTextResolved(execId);
      }
    };

    this.rafId = requestAnimationFrame(render);
  }

  onTextResolved(execId) {
    if (execId !== this.executionId || !this.isIntersecting) return;

    this.setState('RESOLVED');
    if (this.textEl) this.textEl.textContent = this.options.text;

    // Pausa com o texto perfeitamente legível por 180 ms
    this.scheduleTimer(() => {
      this.runMorphing(execId);
    }, this.options.pauseDuration, execId);
  }

  runMorphing(execId) {
    if (execId !== this.executionId || !this.isIntersecting) return;

    this.setState('MORPHING');

    // Sequência de cortes discretos em 280 ms (sem interpolação suave / sem aberração cromática):
    // 0–40 ms: texto estável
    // 40–85 ms: deslocamento horizontal de fragmentos (2 faixas de texto, 2–4px)
    // 85–125 ms: primeira aparição parcial do barcode (1 faixa barcode + 1 faixa texto)
    // 125–180 ms: alternância rápida entre fragmentos de texto e barcode
    // 180–230 ms: barcode quase completo, com corte horizontal discreto
    // 230–280 ms: barcode final totalmente estável

    // Frame 1 (40ms): 2 fatias de texto com deslocamentos discretos
    this.scheduleTimer(() => {
      if (!this.slicesWrap || execId !== this.executionId) return;
      this.textEl.style.opacity = '0';
      this.imgWrap.style.opacity = '0';
      this.slicesWrap.innerHTML = `
        <span class="barcode-reveal-text morph-slice" style="clip-path: inset(0 0 52% 0); transform: translateX(-3px);">${this.options.text}</span>
        <span class="barcode-reveal-text morph-slice" style="clip-path: inset(48% 0 0 0); transform: translateX(3px);">${this.options.text}</span>
      `;
    }, 40, execId);

    // Frame 2 (85ms): Primeira aparição de fatia do barcode
    this.scheduleTimer(() => {
      if (!this.slicesWrap || execId !== this.executionId) return;
      this.slicesWrap.innerHTML = `
        <div class="morph-slice-img" style="clip-path: inset(0 0 50% 0); transform: translateX(2px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <span class="barcode-reveal-text morph-slice" style="clip-path: inset(50% 0 0 0); transform: translateX(-3px);">${this.options.text}</span>
      `;
    }, 85, execId);

    // Frame 3 (125ms): Alternância rápida de fragmentos
    this.scheduleTimer(() => {
      if (!this.slicesWrap || execId !== this.executionId) return;
      this.slicesWrap.innerHTML = `
        <div class="morph-slice-img" style="clip-path: inset(0 0 65% 0); transform: translateX(-2px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <span class="barcode-reveal-text morph-slice" style="clip-path: inset(35% 0 35% 0); transform: translateX(4px);">${this.options.text}</span>
        <div class="morph-slice-img" style="clip-path: inset(65% 0 0 0); transform: translateX(2px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
      `;
    }, 125, execId);

    // Frame 4 (180ms): Barcode quase completo com 1 corte horizontal discreto
    this.scheduleTimer(() => {
      if (!this.slicesWrap || execId !== this.executionId) return;
      this.slicesWrap.innerHTML = `
        <div class="morph-slice-img" style="clip-path: inset(0 0 55% 0); transform: translateX(0);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <div class="morph-slice-img" style="clip-path: inset(45% 0 30% 0); transform: translateX(-2px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <div class="morph-slice-img" style="clip-path: inset(70% 0 0 0); transform: translateX(0);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
      `;
    }, 180, execId);

    // Frame 5 (230ms): Quase final, micro jitter de 1px
    this.scheduleTimer(() => {
      if (!this.slicesWrap || execId !== this.executionId) return;
      this.slicesWrap.innerHTML = `
        <div class="morph-slice-img" style="clip-path: inset(0 0 40% 0); transform: translateX(0);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <div class="morph-slice-img" style="clip-path: inset(60% 0 0 0); transform: translateX(1px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
      `;
    }, 230, execId);

    // Frame 6 (280ms): Conclusão da transição
    this.scheduleTimer(() => {
      this.onMorphComplete(execId);
    }, 280, execId);
  }

  onMorphComplete(execId) {
    if (execId !== this.executionId || !this.isIntersecting) return;

    this.setState('BARCODE');
    this.scheduleNextPeriodicGlitch(execId);
  }

  scheduleNextPeriodicGlitch(execId) {
    if (checkPrefersReducedMotion()) return;

    const interval =
      this.options.minGlitchInterval +
      Math.random() * (this.options.maxGlitchInterval - this.options.minGlitchInterval);

    this.scheduleTimer(() => {
      this.triggerPeriodicGlitch(execId);
    }, interval, execId);
  }

  triggerPeriodicGlitch(execId) {
    if (execId !== this.executionId || !this.isIntersecting || this.state !== 'BARCODE') return;

    this.setState('GLITCH');

    const duration =
      this.options.minGlitchDuration +
      Math.random() * (this.options.maxGlitchDuration - this.options.minGlitchDuration);

    const offset1 = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    const offset2 = -offset1;

    // 1 ou 2 faixas horizontais por ocorrência, deslocamentos entre 1 e 3 px
    if (this.slicesWrap) {
      this.slicesWrap.innerHTML = `
        <div class="morph-slice-img" style="clip-path: inset(25% 0 45% 0); transform: translateX(${offset1}px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
        <div class="morph-slice-img" style="clip-path: inset(55% 0 15% 0); transform: translateX(${offset2}px);">
          <img src="${this.options.barcodeSrc}" alt="" class="barcode-reveal-img" />
        </div>
      `;
    }

    this.scheduleTimer(() => {
      if (execId !== this.executionId || !this.isIntersecting) return;
      this.setState('BARCODE');
      this.scheduleNextPeriodicGlitch(execId);
    }, duration, execId);
  }

  destroy() {
    this.clearAllTimers();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

export function initBarcodeReveal() {
  const container = document.getElementById('barcodeRevealContainer');
  if (!container) return null;

  return new PraxisBarcodeReveal(container);
}
