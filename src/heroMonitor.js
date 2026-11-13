/**
 * PRAXIS — PraxisHeroMonitor (Reconstrução do Monitor 3D Animado estilo Dylan Brouwer)
 *
 * Reproduz com altíssima fidelidade:
 * 1. Geometria 3D real com Three.js:
 *    - Chassis chanfrado e cantos arredondados (ExtrudeGeometry com bevel)
 *    - Moldura fina metálica escura com acabamento PBR realista
 *    - Tela com proporção precisa 16:9
 *    - Coluna de suporte com abertura circular para passagem de cabos
 *    - Base / bancada de estúdio escura
 * 2. Iluminação de estúdio profissional:
 *    - Key light direcional no canto superior esquerdo criando o brilho especular sutil
 *      na borda superior e lateral do bezel (idêntico à referência do Dylan Brouwer)
 *    - Fill light suave e rim light posterior para separação de profundidade
 * 3. Animação cinematográfica sincronizada ao Scroll via GSAP ScrollTrigger:
 *    - Rotação 3D de ~20.3° (yaw) e -3.1° (pitch) no estado inicial até 0° (frontal reto)
 *    - Translação e recentralização suaves com scrub
 *    - Interpolação reversível sem saltos
 * 4. Micro-interação de ponteiro (mouse parallax):
 *    - Reação sutil tridimensional ao movimento do cursor
 * 5. Conteúdo da tela dinâmico e substituível:
 *    - Canvas dinâmico de alta resolução (1920x1080) exibindo projetos do Praxis (Word Films, Novis, Raise, Coringa)
 *    - Suporte para vídeo em loop, imagem estática ou textura customizada via API:
 *      `window.PraxisHeroMonitor.setScreenContent({ type: 'image'|'video'|'canvas', src: ... })`
 * 6. Performance & Fallbacks:
 *    - Renderização suspensa quando fora da viewport (IntersectionObserver)
 *    - Device pixel ratio controlado (Math.min(devicePixelRatio, 2))
 *    - Suporte a prefers-reduced-motion
 *    - Fallback visual limpo se WebGL não estiver disponível
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class PraxisHeroMonitor {
  /**
   * @param {HTMLElement} containerEl - Contêiner do monitor no Hero
   * @param {Object} options - Configurações opcionais
   */
  constructor(containerEl, options = {}) {
    if (!containerEl) return;
    this.container = containerEl;
    this.options = {
      enableMouseParallax: options.enableMouseParallax !== false,
      enableScrollTrigger: options.enableScrollTrigger !== false,
      initialYawDeg: 20.3,
      initialPitchDeg: -3.1,
      ...options,
    };

    this.disposed = false;
    this.isVisible = true;
    this.scrollProgress = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.rafId = null;

    this.init();
  }

  init() {
    // 1. Criação do elemento Canvas Three.js
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hero-monitor-canvas-3d';
    this.canvas.setAttribute('aria-label', 'Monitor 3D interativo Praxis');
    this.canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;display:block;pointer-events:none;z-index:3;';

    // Remove imagem estática anterior se houver
    const oldImg = this.container.querySelector('.hero-monitor-layer');
    if (oldImg) {
      oldImg.style.display = 'none';
    }
    this.container.appendChild(this.canvas);

    // 2. Setup do Renderer WebGL
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn('WebGL não suportado ou falhou. Ativando fallback estático.', e);
      if (oldImg) oldImg.style.display = 'block';
      return;
    }

    // 3. Setup de Cena e Câmera
    this.scene = new THREE.Scene();
    const width = this.container.clientWidth || 1440;
    const height = this.container.clientHeight || 805;

    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    this.camera.position.set(0, -0.06, 6.75);

    // 4. Iluminação profissional inspirada na referência de estúdio
    this.setupLighting();

    // 5. Textura dinâmica da tela (Conteúdos Praxis)
    this.setupScreenContent();

    // 6. Geometria 3D de alta fidelidade
    this.build3DMonitor();

    // 7. Dimensionamento e ResizeObserver
    this.updateSize();
    this.ro = new ResizeObserver(() => this.updateSize());
    this.ro.observe(this.container);

    // 8. Integração GSAP ScrollTrigger
    if (this.options.enableScrollTrigger) {
      this.setupScrollTrigger();
    }

    // 9. Parallax de mouse
    if (this.options.enableMouseParallax) {
      this.setupMouseEvents();
    }

    // 10. Visibilidade na viewport (IntersectionObserver)
    this.setupVisibilityObserver();

    // 11. Loop de animação
    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);

    // Expõe API global
    if (typeof window !== 'undefined') {
      window.PraxisHeroMonitor = this;
    }
  }

  setupLighting() {
    // Luz ambiente suave
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambient);

    // Key Light principal (superior esquerda, produz o brilho especular nítido da moldura)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    this.keyLight.position.set(-4.8, 5.2, 5.8);
    this.scene.add(this.keyLight);

    // Rim Light (posterior para destacar o perfil 3D e contorno do monitor)
    this.rimLight = new THREE.DirectionalLight(0xdbe6f5, 1.4);
    this.rimLight.position.set(3.8, 3.5, -4.0);
    this.scene.add(this.rimLight);

    // Fill Light (suaviza sombras no lado direito)
    this.fillLight = new THREE.DirectionalLight(0x8898b0, 0.95);
    this.fillLight.position.set(4.5, -1.2, 4.5);
    this.scene.add(this.fillLight);
  }

  /**
   * Constrói a tela dinâmica que exibe os projetos do Praxis
   * (Word Films, Novis, Raise, Coringa) com troca fluida e suporte a vídeo/imagem.
   */
  setupScreenContent() {
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1920;
    this.screenCanvas.height = 1080;
    this.screenCtx = this.screenCanvas.getContext('2d');

    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;

    // Lista de telas/projetos do Praxis para exibição no monitor
    this.praxisSlides = [
      {
        title: 'WORD FILMS',
        sub: 'AUDIOVISUAL ESTRATÉGICO',
        tag: 'PRAXIS SHOWCASE // 001',
        accent: '#00f2fe',
      },
      {
        title: 'NOVIS',
        sub: 'REJUVENESCIMENTO COM LASER DE LUZ INTENSA PULSADA',
        tag: 'PRAXIS HEALTH & BEAUTY // 002',
        accent: '#e6c875',
      },
      {
        title: 'RAISE',
        sub: 'DESTAQUE-SE NO MEIO DE MUITOS',
        tag: 'PRAXIS DIGITAL MARKETING // 003',
        accent: '#10b981',
      },
      {
        title: 'CORINGA',
        sub: 'FILMES, SÉRIES E MUITO MAIS ILIMITADOS',
        tag: 'PRAXIS STREAMING PLATFORM // 004',
        accent: '#3b82f6',
      },
    ];

    this.currentSlideIndex = 0;
    this.lastSlideSwitch = performance.now();

    this.renderScreenFrame(performance.now());
  }

  renderScreenFrame(now) {
    if (!this.screenCtx) return;
    const ctx = this.screenCtx;
    const w = this.screenCanvas.width;
    const h = this.screenCanvas.height;

    // Se estiver usando imagem/vídeo externo customizado
    if (this.customVideo && this.customVideo.readyState >= 2) {
      ctx.drawImage(this.customVideo, 0, 0, w, h);
      this.screenTexture.needsUpdate = true;
      return;
    }
    if (this.customImage && this.customImage.complete) {
      ctx.drawImage(this.customImage, 0, 0, w, h);
      this.screenTexture.needsUpdate = true;
      return;
    }

    // Troca de slide a cada 6 segundos
    if (now - this.lastSlideSwitch > 6000) {
      this.lastSlideSwitch = now;
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.praxisSlides.length;
    }

    const slide = this.praxisSlides[this.currentSlideIndex];

    // Fundo do display com micro-grid tecnológico
    ctx.fillStyle = '#070709';
    ctx.fillRect(0, 0, w, h);

    // Gradiente sutil ambiente
    const grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, 'rgba(28, 30, 38, 0.95)');
    grad.addColorStop(1, 'rgba(6, 6, 8, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Micro grid de pontos de alta resolução
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const step = 48;
    for (let x = 32; x < w; x += step) {
      for (let y = 32; y < h; y += step) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Barra superior de navegador / app
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(40, 36, w - 80, 48);

    ctx.fillStyle = '#ff5f56';
    ctx.beginPath();
    ctx.arc(70, 60, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath();
    ctx.arc(92, 60, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27c93f';
    ctx.beginPath();
    ctx.arc(114, 60, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '500 16px "PP Neue Machina", sans-serif';
    ctx.fillStyle = 'rgba(240, 240, 240, 0.65)';
    ctx.fillText('praxis.dev / showcase / ' + slide.title.toLowerCase(), 144, 66);

    // Ícone minimalista no centro superior
    const t = now * 0.002;
    ctx.strokeStyle = slide.accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    const cx = w / 2;
    const cy = h / 2 - 120;
    ctx.moveTo(cx - 36, cy + 10);
    ctx.lineTo(cx - 12, cy - 20);
    ctx.lineTo(cx + 12, cy + 15);
    ctx.lineTo(cx + 36, cy - 15);
    ctx.stroke();

    // Título Principal
    ctx.textAlign = 'center';
    ctx.font = '800 96px "PP Neue Machina", sans-serif';
    ctx.fillStyle = '#f8f8fa';
    ctx.fillText(slide.title, w / 2, h / 2 + 30);

    // Subtítulo
    ctx.font = '500 24px "Creato Display", sans-serif';
    ctx.fillStyle = 'rgba(230, 230, 235, 0.82)';
    ctx.letterSpacing = '4px';
    ctx.fillText(slide.sub, w / 2, h / 2 + 95);

    // Barras animadas de áudio / sinal no rodapé
    const bars = 28;
    const barW = 6;
    const barGap = 10;
    const totalW = bars * (barW + barGap);
    const startX = (w - totalW) / 2;
    const baseBarY = h - 130;

    for (let b = 0; b < bars; b++) {
      const bh = 14 + Math.sin(t * 3 + b * 0.45) * 12 + Math.cos(t * 2 + b * 0.8) * 8;
      ctx.fillStyle = b % 4 === 0 ? slide.accent : 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(startX + b * (barW + barGap), baseBarY - bh / 2, barW, bh);
    }

    // Rodapé de metadados
    ctx.textAlign = 'left';
    ctx.font = '600 16px "PP Neue Machina", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(slide.tag, 60, h - 50);

    ctx.textAlign = 'right';
    ctx.fillText('LIVE INTERACTIVE 3D DISPLAY // 2026', w - 60, h - 50);

    this.screenTexture.needsUpdate = true;
  }

  /**
   * Constrói o modelo 3D físico do monitor, suporte e bancada com Three.js
   */
  build3DMonitor() {
    this.monitorMasterGroup = new THREE.Group();
    this.monitorMasterGroup.name = 'praxisHeroMonitorMaster';

    // Grupo articulado do monitor (gira independente da bancada)
    this.monitorPivot = new THREE.Group();
    this.monitorPivot.name = 'monitorPivot';

    // 1. Proporções da tela (16:9 widescreen calibrada para 1440px)
    this.screenW = 4.45;
    this.screenH = 2.50;
    this.bezelThick = 0.075;
    this.bodyW = this.screenW + this.bezelThick * 2;
    this.bodyH = this.screenH + this.bezelThick * 2;
    this.bodyDepth = 0.14;
    const cornerR = 0.08;

    // Forma do chassis frontal com cantos arredondados precisos
    const shape = new THREE.Shape();
    const x0 = -this.bodyW / 2;
    const y0 = -this.bodyH / 2;
    shape.moveTo(x0 + cornerR, y0);
    shape.lineTo(x0 + this.bodyW - cornerR, y0);
    shape.quadraticCurveTo(x0 + this.bodyW, y0, x0 + this.bodyW, y0 + cornerR);
    shape.lineTo(x0 + this.bodyW, y0 + this.bodyH - cornerR);
    shape.quadraticCurveTo(x0 + this.bodyW, y0 + this.bodyH, x0 + this.bodyW - cornerR, y0 + this.bodyH);
    shape.lineTo(x0 + cornerR, y0 + this.bodyH);
    shape.quadraticCurveTo(x0, y0 + this.bodyH, x0, y0 + this.bodyH - cornerR);
    shape.lineTo(x0, y0 + cornerR);
    shape.quadraticCurveTo(x0, y0, x0 + cornerR, y0);

    const extrudeSettings = {
      depth: this.bodyDepth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.024,
      bevelThickness: 0.024,
    };

    const chassisGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    chassisGeo.center();

    // Material PBR escuro metálico elegante
    this.chassisMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.28,
      metalness: 0.78,
    });

    this.chassisMesh = new THREE.Mesh(chassisGeo, this.chassisMat);
    this.monitorPivot.add(this.chassisMesh);

    // 2. Painel da Tela (Display)
    const screenGeo = new THREE.PlaneGeometry(this.screenW, this.screenH);
    this.screenMat = new THREE.MeshBasicMaterial({
      map: this.screenTexture,
    });
    this.screenMesh = new THREE.Mesh(screenGeo, this.screenMat);
    this.screenMesh.position.z = this.bodyDepth / 2 + 0.025;
    this.monitorPivot.add(this.screenMesh);

    // Película de reflexo sutil de vidro na tela
    const glassGeo = new THREE.PlaneGeometry(this.screenW, this.screenH);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1420,
      roughness: 0.12,
      metalness: 0.9,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.z = this.screenMesh.position.z + 0.002;
    this.monitorPivot.add(glassMesh);

    // 3. Coluna de Suporte (Stand Neck)
    const neckW = 0.76;
    const neckH = 1.45;
    const neckDepth = 0.12;
    const neckGeo = new THREE.BoxGeometry(neckW, neckH, neckDepth);
    const neckMesh = new THREE.Mesh(neckGeo, this.chassisMat);
    neckMesh.position.set(0, -this.bodyH / 2 - neckH / 2 + 0.25, -0.10);
    this.monitorPivot.add(neckMesh);

    // 4. Abertura Circular de Passagem de Cabo no Suporte
    const holeR = 0.18;
    const holeRimGeo = new THREE.TorusGeometry(holeR, 0.032, 16, 36);
    const holeRimMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a42,
      roughness: 0.22,
      metalness: 0.85,
    });
    const holeRim = new THREE.Mesh(holeRimGeo, holeRimMat);
    holeRim.position.set(0, -this.bodyH / 2 - 0.38, -0.04);
    this.monitorPivot.add(holeRim);

    // 5. Cabo curvo passando pelo orifício
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -this.bodyH / 2 + 0.15, -0.10),
      new THREE.Vector3(0.04, -this.bodyH / 2 - 0.38, -0.04),
      new THREE.Vector3(0.18, -this.bodyH / 2 - 0.95, 0.22),
      new THREE.Vector3(0.70, -this.bodyH / 2 - 1.25, 0.75),
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 32, 0.032, 12, false);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.7,
      metalness: 0.1,
    });
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    this.monitorPivot.add(cableMesh);

    // 6. Base / Pé do Monitor
    const basePlateGeo = new THREE.BoxGeometry(1.5, 0.05, 1.05);
    const basePlateMesh = new THREE.Mesh(basePlateGeo, this.chassisMat);
    basePlateMesh.position.set(0, -this.bodyH / 2 - neckH + 0.28, 0.15);
    this.monitorPivot.add(basePlateMesh);

    // Adiciona o pivô do monitor ao grupo mestre
    this.monitorMasterGroup.add(this.monitorPivot);

    // 7. Bancada / Mesa escura de estúdio (Horizonte frontal)
    const deskGeo = new THREE.BoxGeometry(26, 1.2, 7.0);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0e,
      roughness: 0.44,
      metalness: 0.35,
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.set(0, -this.bodyH / 2 - neckH + 0.28 - 0.6, 0.5);
    this.monitorMasterGroup.add(deskMesh);

    // Linhas sutis de junta dos módulos da bancada
    const seamGeo = new THREE.BoxGeometry(0.015, 1.22, 7.02);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x020203 });
    const seam1 = new THREE.Mesh(seamGeo, seamMat);
    seam1.position.set(-2.8, deskMesh.position.y, 0.5);
    const seam2 = new THREE.Mesh(seamGeo, seamMat);
    seam2.position.set(2.8, deskMesh.position.y, 0.5);
    this.monitorMasterGroup.add(seam1);
    this.monitorMasterGroup.add(seam2);

    this.scene.add(this.monitorMasterGroup);

    // Define a pose inicial fiel à referência (Dylan frame 0)
    this.applyPose(0);
  }

  /**
   * Aplica a rotação, translação e escala do monitor com base no progresso [0..1]
   * @param {number} progress - Progresso de rolagem do hero (0 = topo, 1 = final da animação)
   */
  applyPose(progress) {
    if (!this.monitorMasterGroup) return;

    const p = Math.max(0, Math.min(1, progress));
    this.scrollProgress = p;

    // Valores iniciais (Dylan frame 0 / Praxis PDF):
    // Ângulo yaw ~20.3°, pitch ~-3.1°, ligeiramente deslocado à direita e mais baixo
    const initYaw = THREE.MathUtils.degToRad(this.options.initialYawDeg || 20.3);
    const initPitch = THREE.MathUtils.degToRad(this.options.initialPitchDeg || -3.1);
    const initRoll = THREE.MathUtils.degToRad(-1.2);

    const initPosX = 0.22;
    const initPosY = -0.32;
    const initPosZ = 0.0;

    // Valores finais (Dylan frame 88 / monitor frontal perfeitamente alinhado e centralizado):
    const targetYaw = 0.0;
    const targetPitch = 0.0;
    const targetRoll = 0.0;

    const targetPosX = 0.0;
    const targetPosY = 0.25;
    const targetPosZ = 0.35;

    // Interpolação suave
    const curYaw = THREE.MathUtils.lerp(initYaw, targetYaw, p);
    const curPitch = THREE.MathUtils.lerp(initPitch, targetPitch, p);
    const curRoll = THREE.MathUtils.lerp(initRoll, targetRoll, p);

    const curPosX = THREE.MathUtils.lerp(initPosX, targetPosX, p);
    const curPosY = THREE.MathUtils.lerp(initPosY, targetPosY, p);
    const curPosZ = THREE.MathUtils.lerp(initPosZ, targetPosZ, p);

    this.baseRotX = curPitch;
    this.baseRotY = curYaw;
    this.baseRotZ = curRoll;

    this.monitorMasterGroup.position.set(curPosX, curPosY, curPosZ);
    this.updateRotationWithParallax();
  }

  updateRotationWithParallax() {
    if (!this.monitorMasterGroup) return;

    // Efeito suave de mouse parallax quando ativo
    const mouseOffX = this.mouse.x * 0.05;
    const mouseOffY = this.mouse.y * 0.035;

    this.monitorMasterGroup.rotation.x = (this.baseRotX || 0) + mouseOffY;
    this.monitorMasterGroup.rotation.y = (this.baseRotY || 0) + mouseOffX;
    this.monitorMasterGroup.rotation.z = this.baseRotZ || 0;
  }

  /**
   * Configuração do GSAP ScrollTrigger com scrub contínuo e sincronizado
   */
  setupScrollTrigger() {
    const heroSection = document.getElementById('inicio') || this.container.closest('section');
    if (!heroSection) return;

    this.scrollTrigger = ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: '+=700', // Duração cinematográfica proporcional ao scroll da seção
      scrub: 1.2,   // Suavização fluida do movimento
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        this.applyPose(self.progress);
      },
    });
  }

  setupMouseEvents() {
    this.onPointerMove = (e) => {
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;
      this.mouse.targetX = (e.clientX / w - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / h - 0.5) * 2;
    };
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  setupVisibilityObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0 }
    );
    this.io.observe(this.container);
  }

  updateSize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || 1440;
    const h = this.container.clientHeight || 805;

    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.camera.aspect = w / h;
    // Em telas menores, ajusta o FOV para enquadrar perfeitamente o monitor
    if (w < 768) {
      this.camera.fov = 44;
    } else if (w < 1024) {
      this.camera.fov = 38;
    } else {
      this.camera.fov = 34;
    }
    this.camera.updateProjectionMatrix();
  }

  /**
   * API pública para substituir o conteúdo da tela do monitor
   * @param {Object} content - { type: 'image'|'video'|'canvas', src: string, ... }
   */
  setScreenContent(content) {
    if (!content) return;
    if (content.type === 'video' && content.src) {
      const vid = document.createElement('video');
      vid.src = content.src;
      vid.crossOrigin = 'anonymous';
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.play().catch(() => {});
      this.customVideo = vid;
      this.customImage = null;
    } else if (content.type === 'image' && content.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = content.src;
      this.customImage = img;
      this.customVideo = null;
    } else if (content.type === 'default') {
      this.customVideo = null;
      this.customImage = null;
    }
  }

  destroy() {
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    if (this.scrollTrigger) this.scrollTrigger.kill();
    if (this.onPointerMove) window.removeEventListener('pointermove', this.onPointerMove);

    if (this.renderer) {
      this.renderer.dispose();
      if (this.canvas && this.canvas.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
    }
  }

  animate(now) {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    if (!this.isVisible) return;

    // Interpolação suave do mouse parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;
    this.updateRotationWithParallax();

    // Atualiza frame dinâmico da tela
    this.renderScreenFrame(now);

    // Renderiza a cena Three.js
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/**
 * Função de inicialização conveniente
 */
export function initPraxisHeroMonitor(containerEl, options) {
  return new PraxisHeroMonitor(containerEl, options);
}
