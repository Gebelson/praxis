/**
 * PRAXIS — Hero Text Decoder & Periodic Glitch Engine
 *
 * Implements:
 * 1. Progressive brutalist minimalist monochrome text decoding animation
 *    for the giant background hero heading:
 *      "PROCURANDO UM SITE DE VERDADE?"
 * 2. Recurrent decoding on every complete exit from viewport and re-entry.
 * 3. Subtle, brutalist, monochrome periodic glitching while idle in view (5-9s interval, ~160ms duration).
 * 4. 100% typographic stability (ghost character preserves exact OpenType metrics of Pemage Regular).
 * 5. Strict state machine: 'outside' -> 'decoding' -> 'idle' -> 'glitching' -> 'idle'.
 */

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_#/*-';

export class HeroTextDecoder {
  /**
   * @param {HTMLElement} textLayer - The .hero-sticky-text-layer container
   * @param {Object} [options]
   * @param {boolean} [options.prefersReducedMotion=false]
   * @param {number} [options.duration=1400] - Total decode duration in ms (1200-1600ms)
   * @param {number} [options.tickInterval=40] - Scramble interval in ms (35-50ms)
   */
  constructor(textLayer, options = {}) {
    this.textLayer = textLayer;
    this.options = {
      duration: 1400,
      tickInterval: 40,
      prefersReducedMotion: false,
      ...options,
    };

    this.title = textLayer ? textLayer.querySelector('#heroStickyTitle') : null;
    this.line1 = textLayer ? textLayer.querySelector('.hero-title-line1') : null;
    this.line2 = textLayer ? textLayer.querySelector('.hero-title-line2') : null;

    this.slots = [];
    this.timer = null;
    this.startTime = 0;
    this.state = 'outside'; // 'outside' | 'decoding' | 'idle' | 'glitching'
    this.decodeCount = 0;
    this.glitchCount = 0;

    // Glitch management
    this.glitchTimer = null;
    this.glitchTimeouts = [];

    // Listeners
    this.scrollHandler = null;

    if (!this.title || !this.line1 || !this.line2) {
      return;
    }

    // Accessible semantic labeling
    this.titleTexts=[this.line1.textContent.trim(),this.line2.textContent.trim()];
    this.title.setAttribute('aria-label', this.titleTexts.join(' '));

    this.setupSlots();

    if (this.options.prefersReducedMotion) {
      this.resolveImmediately();
      return;
    }

    this.setupListeners();
    // Immediate initial check
    this.handleVisibilityChange();
  }

  /**
   * Builds fixed-width character slots for a line element.
   * @private
   */
  createLineSlots(container, text) {
    container.innerHTML = '';
    const lineSlots = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ') {
        const space = document.createElement('span');
        space.className = 'hero-char-slot hero-char-space';
        space.setAttribute('aria-hidden', 'true');
        space.textContent = ' ';
        container.appendChild(space);
      } else {
        const slot = document.createElement('span');
        slot.className = 'hero-char-slot';
        slot.dataset.char = ch;
        slot.setAttribute('aria-hidden', 'true');

        const ghost = document.createElement('span');
        ghost.className = 'hero-char-ghost';
        ghost.textContent = ch;

        const glyph = document.createElement('span');
        glyph.className = 'hero-char-glyph';
        glyph.textContent = ch;

        slot.appendChild(ghost);
        slot.appendChild(glyph);
        container.appendChild(slot);

        lineSlots.push({
          slot,
          ghost,
          glyph,
          target: ch,
          resolved: false,
        });
      }
    }

    return lineSlots;
  }

  /**
   * Initializes the DOM structure for both lines.
   */
  setupSlots() {
    const slots1 = this.createLineSlots(this.line1, this.titleTexts[0]);
    const slots2 = this.createLineSlots(this.line2, this.titleTexts[1]);
    this.slots = [...slots1, ...slots2];
  }

  /**
   * Sets up scroll and resize listeners.
   * @private
   */
  setupListeners() {
    this.scrollHandler = () => {
      this.handleVisibilityChange();
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', this.scrollHandler, { passive: true });
  }

  /**
   * Returns whether any part of the hero title is inside the visible viewport.
   */
  isVisible() {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const isPinned = window.innerWidth >= 768;
    const retentionLimit = isPinned ? 3200 : 700;

    if (scrollY <= retentionLimit) return true;

    if (this.line1 && this.line2) {
      const r1 = this.line1.getBoundingClientRect();
      const r2 = this.line2.getBoundingClientRect();
      const bottom = Math.max(r1.bottom, r2.bottom);
      const top = Math.min(r1.top, r2.top);
      return bottom > 0 && top < window.innerHeight;
    }
    return false;
  }

  /**
   * Returns whether the hero title has completely exited the viewport.
   * Prevents internal ScrollTrigger pinning changes from triggering false exits.
   */
  isCompletelyOutside() {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const isPinned = window.innerWidth >= 768;
    const retentionLimit = isPinned ? 3200 : 700;

    // Inside hero pinning and retention, text cannot be outside
    if (scrollY <= retentionLimit) return false;

    if (this.line1 && this.line2) {
      const r1 = this.line1.getBoundingClientRect();
      const r2 = this.line2.getBoundingClientRect();
      const bottom = Math.max(r1.bottom, r2.bottom);
      return bottom <= 0;
    }
    return scrollY > (isPinned ? 3400 : 900);
  }

  /**
   * State machine coordinator.
   */
  handleVisibilityChange() {
    if (this.options.prefersReducedMotion) return;

    const visible = this.isVisible();
    const completelyOut = this.isCompletelyOutside();

    if (completelyOut) {
      if (this.state !== 'outside') {
        this.transitionTo('outside');
      }
    } else if (visible) {
      if (this.state === 'outside') {
        this.transitionTo('decoding');
      }
    }
  }

  /**
   * Manages transitions between:
   * 'outside' -> 'decoding' -> 'idle' -> 'glitching' -> 'idle'
   * and 'idle'/'glitching' -> 'outside'
   */
  transitionTo(newState) {
    if (this.state === newState) return;

    if (newState === 'outside') {
      this.clearGlitchTimers();
      this.clearGlitchVisuals();
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.state = 'outside';
      this.updateDataAttributes();
    } else if (newState === 'decoding') {
      this.clearGlitchTimers();
      this.clearGlitchVisuals();
      this.state = 'decoding';
      this.updateDataAttributes();
      this.startDecoding();
    } else if (newState === 'idle') {
      this.state = 'idle';
      this.updateDataAttributes();
      this.scheduleNextGlitch();
    } else if (newState === 'glitching') {
      this.state = 'glitching';
      this.updateDataAttributes();
    }
  }

  updateDataAttributes() {
    if (this.textLayer) {
      this.textLayer.dataset.heroState = this.state;
      this.textLayer.dataset.decodeCount = String(this.decodeCount);
      this.textLayer.dataset.glitchCount = String(this.glitchCount);
    }
  }

  /**
   * Starts progressive left-to-right character decoding sequence.
   */
  startDecoding() {
    if (this.options.prefersReducedMotion) {
      this.resolveImmediately();
      return;
    }

    this.decodeCount++;
    this.startTime = performance.now();

    // Initial scramble of all character slots
    this.slots.forEach((s) => {
      s.resolved = false;
      s.ghost.style.visibility = 'hidden';
      s.glyph.style.display = 'inline-flex';
      s.glyph.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
    });

    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.startTime;
      const progress = Math.min(1, elapsed / this.options.duration);

      let resolvedCount = 0;
      const total = this.slots.length;

      this.slots.forEach((s, idx) => {
        // Progressive left-to-right threshold (first char resolves ~250ms, last char at duration)
        const charThreshold = 0.18 + 0.82 * (idx / total);
        if (progress >= charThreshold) {
          s.glyph.textContent = s.target;
          s.ghost.style.visibility = 'visible';
          s.glyph.style.display = 'none';
          s.resolved = true;
          resolvedCount++;
        } else {
          s.glyph.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }
      });

      if (progress >= 1 || resolvedCount === total) {
        this.completeDecoding();
      }
    }, this.options.tickInterval);
  }

  /**
   * Completes the decoding sequence, locking all characters to their final state.
   */
  completeDecoding() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.slots.forEach((s) => {
      s.glyph.textContent = '';
      s.ghost.style.visibility = 'visible';
      s.glyph.style.display = 'none';
      s.resolved = true;
    });

    if (this.textLayer) {
      this.textLayer.dataset.decoded = 'true';
    }

    this.transitionTo('idle');
    this.options.onDecodeComplete?.();
  }

  /**
   * Schedules the next periodic glitch at a random interval between 5000ms and 9000ms.
   */
  scheduleNextGlitch() {
    this.clearGlitchTimers();
    if (this.state !== 'idle' || this.options.prefersReducedMotion) return;

    if (!this.isVisible()) {
      this.transitionTo('outside');
      return;
    }

    const delay = Math.floor(Math.random() * (9000 - 5000 + 1)) + 5000;
    this.glitchTimer = setTimeout(() => {
      this.triggerGlitch();
    }, delay);
  }

  /**
   * Executes a discreet, brutalist, monochrome glitch interference lasting ~160ms.
   * Composed of 2-3 micro-bursts of horizontal slice cuts, 1-3px displacement, and 1-3 character flickers.
   */
  triggerGlitch() {
    if (this.state !== 'idle' || this.options.prefersReducedMotion) return;
    if (!this.isVisible()) {
      this.transitionTo('outside');
      return;
    }

    this.transitionTo('glitching');
    this.glitchCount++;
    this.updateDataAttributes();

    // Pick 1 to 3 random character slots to briefly micro-flicker
    const numFlickerChars = Math.floor(Math.random() * 3) + 1;
    const flickerSlots = [];
    for (let i = 0; i < numFlickerChars; i++) {
      const slot = this.slots[Math.floor(Math.random() * this.slots.length)];
      if (slot && !flickerSlots.includes(slot)) {
        flickerSlots.push(slot);
      }
    }

    // Micro-impulse 1 (0ms - 50ms): Horizontal slice on line 1, slight 1.5-2.5px shift
    const shift1 = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 1.5);
    if (this.line1) {
      this.line1.style.transform = `translate3d(${shift1.toFixed(1)}px, 0, 0)`;
      this.line1.style.clipPath = 'polygon(0 0, 100% 0, 100% 40%, 0 40%, 0 46%, 100% 46%, 100% 100%, 0 100%)';
    }

    flickerSlots.forEach((s) => {
      s.ghost.style.visibility = 'hidden';
      s.glyph.style.display = 'inline-flex';
      s.glyph.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
    });

    // Micro-impulse 2 (55ms - 110ms): Reset line 1, slice cut on line 2 with -1.5px shift
    this.glitchTimeouts.push(
      setTimeout(() => {
        if (this.state !== 'glitching') return;

        if (this.line1) {
          this.line1.style.transform = '';
          this.line1.style.clipPath = '';
        }

        const shift2 = (Math.random() > 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.5);
        if (this.line2) {
          this.line2.style.transform = `translate3d(${shift2.toFixed(1)}px, 0, 0)`;
          this.line2.style.clipPath = 'polygon(0 0, 100% 0, 100% 55%, 0 55%, 0 62%, 100% 62%, 100% 100%, 0 100%)';
        }

        flickerSlots.forEach((s) => {
          s.glyph.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
        });
      }, 55)
    );

    // Micro-impulse 3 (115ms - 160ms): Subtle 1px micro-offset
    this.glitchTimeouts.push(
      setTimeout(() => {
        if (this.state !== 'glitching') return;

        if (this.line2) {
          const shift3 = (Math.random() > 0.5 ? 1 : -1) * 1.0;
          this.line2.style.transform = `translate3d(${shift3.toFixed(1)}px, 0, 0)`;
          this.line2.style.clipPath = '';
        }
      }, 115)
    );

    // Final clean recovery (165ms)
    this.glitchTimeouts.push(
      setTimeout(() => {
        this.clearGlitchVisuals();
        if (this.state === 'glitching') {
          this.transitionTo('idle');
        }
      }, 165)
    );
  }

  /**
   * Resets any temporary glitch transforms, clip-paths, and glyph flickers.
   */
  clearGlitchVisuals() {
    if (this.line1) {
      this.line1.style.transform = '';
      this.line1.style.clipPath = '';
    }
    if (this.line2) {
      this.line2.style.transform = '';
      this.line2.style.clipPath = '';
    }
    this.slots.forEach((s) => {
      s.ghost.style.visibility = 'visible';
      s.glyph.style.display = 'none';
      s.glyph.textContent = '';
    });
  }

  /**
   * Clears scheduled glitch timers.
   */
  clearGlitchTimers() {
    if (this.glitchTimer) {
      clearTimeout(this.glitchTimer);
      this.glitchTimer = null;
    }
    this.glitchTimeouts.forEach((t) => clearTimeout(t));
    this.glitchTimeouts = [];
  }

  /**
   * Resolves immediately to clean legible text (for prefers-reduced-motion).
   */
  resolveImmediately() {
    this.clearGlitchTimers();
    this.clearGlitchVisuals();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.slots.forEach((s) => {
      s.glyph.textContent = '';
      s.ghost.style.visibility = 'visible';
      s.glyph.style.display = 'none';
      s.resolved = true;
    });
    this.state = 'idle';
    if (this.textLayer) {
      this.textLayer.dataset.decoded = 'true';
      this.textLayer.dataset.heroState = 'idle';
    }
    this.options.onDecodeComplete?.();
  }

  /**
   * Destroys timers, observers, and event listeners.
   */
  destroy() {
    this.clearGlitchTimers();
    this.clearGlitchVisuals();

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('resize', this.scrollHandler);
      this.scrollHandler = null;
    }

    this.slots.forEach((s) => {
      s.ghost.style.visibility = 'visible';
      s.glyph.style.display = 'none';
      s.glyph.textContent = '';
    });

    this.state = 'outside';
  }
}
