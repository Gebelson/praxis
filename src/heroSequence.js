/**
 * PRAXIS — Hero Sequence Controller (True Canvas 2D + Staged WebP + Homographic matrix3d Video Projection)
 *
 * Utilizes exclusively the provided Dylan Brouwer 89-frame WebP sequence (db-hero_00000.webp to db-hero_00088.webp)
 * with mathematically aligned subpixel homography and 4-vertex polygon clipping for word-films-loop.mp4.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_FIT_DATA } from './heroFitData.js';

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 89;
const KEYFRAME_INDICES = [0, 11, 22, 33, 44, 55, 66, 77, 88];

export function getFrameIndex(progress) {
  const normalized = Math.max(0, Math.min(1, progress));
  return Math.round(normalized * (FRAME_COUNT - 1));
}

export class HeroSequenceController {
  constructor(options = {}) {
    this.options = {
      scrollDistance: 2600, // Calibrated scrub distance for smooth 89-frame rotation
      ...options,
    };

    this.heroSection = document.getElementById('inicio');
    this.monitorContainer = document.getElementById('heroMonitorContainer');
    this.canvas = document.getElementById('heroSequenceCanvas');
    this.videoWrapper = document.getElementById('heroVideoWrapper');
    this.video = document.getElementById('heroVideoElement');
    this.fallbackImg = this.monitorContainer ? this.monitorContainer.querySelector('.hero-monitor-fallback') : null;
    this.heroText = document.querySelector('.hero-sticky-text-layer');
    this.railLeft = document.getElementById('heroRailLeft');
    this.railRight = document.getElementById('heroRailRight');

    if (!this.heroSection || !this.canvas || !this.video) {
      console.warn('HeroSequenceController: Required elements not found.');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.images = new Array(FRAME_COUNT);
    this.loadedFlags = new Array(FRAME_COUNT).fill(false);
    this.loadedCount = 0;
    this.lastRenderedIndex = -1;
    this.currentProgress = 0;
    this.requestedFrameIndex = 0;
    this.isMobile = window.innerWidth <= 1024;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scrollTriggerInstance = null;

    // Diagnostic Debug HUD setup
    this.debugActive = new URLSearchParams(window.location.search).get('debug') === 'hero';
    this.debugHUD = null;
    if (this.debugActive) {
      this.createDebugHUD();
    }

    this.init();
  }

  init() {
    if (this.isMobile || this.prefersReducedMotion) {
      this.initMobileFallback();
      return;
    }

    // Hide fallback image on desktop sequence
    if (this.fallbackImg) {
      this.fallbackImg.style.display = 'none';
    }

    this.setupCanvasDimensions();
    this.updateResponsiveScale();

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 1024;
      if (this.isMobile) {
        this.initMobileFallback();
        if (this.scrollTriggerInstance) {
          this.scrollTriggerInstance.kill();
          this.scrollTriggerInstance = null;
        }
      } else {
        if (this.canvas) this.canvas.style.display = 'block';
        if (this.videoWrapper) this.videoWrapper.style.display = 'block';
        if (this.fallbackImg) this.fallbackImg.style.display = 'none';
        this.setupCanvasDimensions();
        this.updateResponsiveScale();
        this.renderFrame(this.lastRenderedIndex >= 0 ? this.lastRenderedIndex : 0);
        ScrollTrigger.refresh();
      }
    });

    // Start staged progressive loading of provided 89 frames
    this.startStagedLoading();

    // Setup GSAP ScrollTrigger with true pinning
    this.setupScrollTrigger();

    // Ensure showreel video is playing continuously
    this.video.play().catch(() => {});

    window.PraxisHeroSequence = this;
    window.__PraxisHeroDebug = (enable) => {
      this.debugActive = !!enable;
      if (this.debugActive && !this.debugHUD) {
        this.createDebugHUD();
      } else if (!this.debugActive && this.debugHUD) {
        this.debugHUD.style.display = 'none';
      } else if (this.debugHUD) {
        this.debugHUD.style.display = 'block';
      }
    };
  }

  updateResponsiveScale() {
    if (!this.monitorContainer) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw > 1024) {
      const scaleX = (vw - 40) / 1104;
      const scaleY = (vh - 60) / 832;
      const scale = Math.min(1.0, scaleX, scaleY);
      this.monitorContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
      this.monitorContainer.style.transformOrigin = 'center center';
    } else {
      this.monitorContainer.style.transform = '';
      this.monitorContainer.style.transformOrigin = '';
    }
  }

  setupCanvasDimensions() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Canvas internal buffer size matches 1104 x 832 native frame multiplied by DPR
    this.canvas.width = 1104 * dpr;
    this.canvas.height = 832 * dpr;
    this.dpr = dpr;
  }

  getFrameUrl(index) {
    const num = String(index).padStart(5, '0');
    return `/assets/hero-sequence/db-hero_${num}.webp`;
  }

  loadSingleFrame(index) {
    return new Promise((resolve) => {
      if (this.loadedFlags[index]) {
        resolve(this.images[index]);
        return;
      }
      const img = new Image();
      img.decoding = 'async';
      img.src = this.getFrameUrl(index);
      img.onload = () => {
        this.images[index] = img;
        this.loadedFlags[index] = true;
        this.loadedCount++;
        this.updateDebugHUD();
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`HeroSequence: Failed to load frame ${index} from ${img.src}`);
        resolve(null);
      };
    });
  }

  async startStagedLoading() {
    // Stage 1: Load Frame 0 first for instant TTI (<50ms)
    const f0 = await this.loadSingleFrame(0);
    if (f0) {
      this.renderFrame(0);
      this.updateVideoTransform(0);
    }

    // Stage 2: Load 8 Keyframes (11, 22, 33, 44, 55, 66, 77, 88)
    const keyframePromises = KEYFRAME_INDICES.filter((i) => i !== 0).map((i) => this.loadSingleFrame(i));
    await Promise.all(keyframePromises);

    // Stage 3: Load remaining frames progressively
    for (let i = 1; i < FRAME_COUNT; i++) {
      if (!this.loadedFlags[i]) {
        await this.loadSingleFrame(i);
      }
    }
  }

  nearestLoaded(targetIndex) {
    if (this.loadedFlags[targetIndex]) return targetIndex;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (targetIndex - d >= 0 && this.loadedFlags[targetIndex - d]) return targetIndex - d;
      if (targetIndex + d < FRAME_COUNT && this.loadedFlags[targetIndex + d]) return targetIndex + d;
    }
    return 0;
  }

  renderFrame(targetIndex) {
    if (!this.ctx || !this.canvas) return;
    const safeIndex = Math.max(0, Math.min(FRAME_COUNT - 1, targetIndex));
    this.requestedFrameIndex = safeIndex;
    const activeIndex = this.nearestLoaded(safeIndex);
    const img = this.images[activeIndex];

    if (!img) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, 0, 0, cw, ch);

    // Subpixel screen cutout with destination-out: guarantees transparent screen hole
    const fit = HERO_FIT_DATA[activeIndex];
    if (fit && fit.c) {
      const scaleX = cw / 1104;
      const scaleY = ch / 832;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(fit.c.topLeft[0] * scaleX, fit.c.topLeft[1] * scaleY);
      this.ctx.lineTo(fit.c.topRight[0] * scaleX, fit.c.topRight[1] * scaleY);
      this.ctx.lineTo(fit.c.bottomRight[0] * scaleX, fit.c.bottomRight[1] * scaleY);
      this.ctx.lineTo(fit.c.bottomLeft[0] * scaleX, fit.c.bottomLeft[1] * scaleY);
      this.ctx.closePath();
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fill();
      this.ctx.restore();
    }

    this.lastRenderedIndex = activeIndex;
    this.updateDebugHUD();
  }

  updateVideoTransform(progress) {
    const p = Math.max(0, Math.min(1, progress));
    this.currentProgress = p;

    // 1. Frame Index & Canvas Draw
    const frameIndex = getFrameIndex(p);
    this.renderFrame(frameIndex);

    // 2. Homographic matrix3d Transform & clipPath from pre-computed dataset
    const fit = HERO_FIT_DATA[frameIndex];
    if (fit) {
      if (this.video) {
        if (this.video.paused) {
          this.video.play().catch(() => {});
        }
        this.video.style.transformOrigin = '0 0';
        this.video.style.transform = fit.m;
      }
      if (this.videoWrapper) {
        this.videoWrapper.style.clipPath = fit.cp;
      }
    }

    // 3. Side Rails Scroll Sync (Opposite Directions)
    if (this.railLeft) {
      this.railLeft.style.transform = `translateY(${-p * 240}px)`;
    }
    if (this.railRight) {
      this.railRight.style.transform = `translateY(${p * 240}px)`;
    }

    // 4. Subtle Title Fade towards end of Hero scroll (0.80 -> 1.0)
    if (this.heroText) {
      if (p > 0.80) {
        const local = (p - 0.80) / 0.20;
        this.heroText.style.filter = `blur(${local * 4}px)`;
        this.heroText.style.opacity = `${1 - local * 0.95}`;
      } else {
        this.heroText.style.filter = 'none';
        this.heroText.style.opacity = '1';
      }
    }

    this.updateDebugHUD();
  }

  setupScrollTrigger() {
    if (this.scrollTriggerInstance) {
      this.scrollTriggerInstance.kill();
    }

    this.scrollTriggerInstance = ScrollTrigger.create({
      trigger: this.heroSection,
      start: 'top top',
      end: `+=${this.options.scrollDistance}`,
      pin: true,
      pinType: 'transform',
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        this.updateVideoTransform(self.progress);
      },
    });

    // Ensure pin-spacer has hero background color to eliminate any gap
    if (this.scrollTriggerInstance.spacer) {
      this.scrollTriggerInstance.spacer.style.backgroundColor = '#d6d2cc';
    }
  }

  createDebugHUD() {
    if (this.debugHUD) return;
    this.debugHUD = document.createElement('div');
    this.debugHUD.id = 'heroDebugHUD';
    this.debugHUD.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      background: rgba(10, 10, 14, 0.92);
      border: 1px solid rgba(0, 229, 153, 0.4);
      color: #00e599;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
      padding: 10px 14px;
      border-radius: 6px;
      z-index: 99999;
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this.debugHUD);
    this.updateDebugHUD();
  }

  updateDebugHUD() {
    if (!this.debugHUD || !this.debugActive) return;
    const fit = HERO_FIT_DATA[this.lastRenderedIndex >= 0 ? this.lastRenderedIndex : 0];
    const sourceUrl = this.getFrameUrl(this.lastRenderedIndex >= 0 ? this.lastRenderedIndex : 0);
    this.debugHUD.innerHTML = `
      <div style="font-weight: bold; color: #fff; margin-bottom: 4px;">HERO SEQUENCE DIAGNOSTIC</div>
      <div>Frame solicitado: <b>${this.requestedFrameIndex}</b> / 88</div>
      <div>Frame desenhado: <b>${this.lastRenderedIndex}</b></div>
      <div>Progresso scroll: <b>${(this.currentProgress * 100).toFixed(1)}%</b></div>
      <div>Imagens carregadas: <b>${this.loadedCount} / ${FRAME_COUNT}</b></div>
      <div>Origem arquivo: <span style="color:#e2e8f0;">${sourceUrl}</span></div>
      <div>Clip-Path vídeo: <span style="color:#828ba0;">${fit ? fit.cp : 'N/A'}</span></div>
      <div>ScrollTrigger: <b>${this.scrollTriggerInstance ? (this.scrollTriggerInstance.isActive ? 'ATIVO (PIN)' : 'INATIVO') : 'OFF'}</b></div>
    `;
  }

  initMobileFallback() {
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    if (this.fallbackImg) {
      this.fallbackImg.style.display = 'block';
    }
    if (this.videoWrapper) {
      this.videoWrapper.style.display = 'none';
    }
    if (this.heroText) {
      this.heroText.style.filter = 'none';
      this.heroText.style.opacity = '1';
    }
  }
}

export function initHeroSequence() {
  return new HeroSequenceController();
}
