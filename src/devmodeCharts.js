/**
 * PRAXIS — Animação de Entrada dos Gráficos Dev Mode (Custo x Tempo)
 * 
 * Orquestração GSAP ScrollTrigger:
 * - 0 a 400 ms: entrada suave do contêiner.
 * - 200 a 1100 ms: preenchimento progressivo do gráfico circular (fatias a partir do centro).
 * - 400 a 1000 ms: desenho dos eixos e linha constante com setas nas pontas.
 * - 900 a 2100 ms: curva de crescimento exponencial desenhada com glow e seta final tangencial.
 * - 1800 a 2300 ms: revelação dos brilhos e consolidação final.
 * 
 * Ativa com 55% do próprio gráfico na área livre do header/blur e repete após sair dela.
 * Respeita prefers-reduced-motion.
 */

import { gsap } from 'gsap';

export function initDevmodeCharts() {
  const chartsWrap = document.getElementById('devmodeChartsWrap');
  if (!chartsWrap) return;
  if(chartsWrap.devmodeCharts)return chartsWrap.devmodeCharts;
  chartsWrap.dataset.chartRun="0";chartsWrap.dataset.chartState="waiting";

  const pieSliceWhite = document.getElementById('pieSliceWhite');
  const pieSliceGrey = document.getElementById('pieSliceGrey');
  const pieDividerTop = document.getElementById('pieDividerTop');
  const pieDividerJoin = document.getElementById('pieDividerJoin');

  const axisVertical = document.getElementById('axisVertical');
  const dotVertical = document.getElementById('dotVertical') || document.getElementById('arrowVertical');
  const axisHorizontal = document.getElementById('axisHorizontal');
  const dotHorizontal = document.getElementById('dotHorizontal') || document.getElementById('arrowHorizontal');
  const lineConstant = document.getElementById('lineConstant');
  const arrowConstant = document.getElementById('arrowConstant');

  const curveGrowth = document.getElementById('curveGrowth');
  const curveArrow = document.getElementById('curveArrow');

  const labelCusto = document.getElementById('labelCusto');
  const labelTempo = document.getElementById('labelTempo');
  const chartLegend = document.getElementById('chartLegend');

  const pieGlowBlur = document.getElementById('pieGlowBlur');
  const curveGlowBlur = document.getElementById('curveGlowBlur');

  // Parâmetros geométricos canônicos do gráfico circular (cx: 70, cy: 90, r: 66.5)
  // Fatia cinza: 72° (20% do total), de 270° anti-horário até 198°
  // Fatia branca: 288° (80% do total), de 270° horário até 198°
  const cx = 70.0;
  const cy = 90.0;
  const baseRadius = 66.5;

  function updatePie(progress, scale) {
    const r = baseRadius * scale;
    if (progress <= 0.001) {
      if (pieSliceGrey) pieSliceGrey.setAttribute('d', '');
      if (pieSliceWhite) pieSliceWhite.setAttribute('d', '');
      if (pieDividerTop) pieDividerTop.setAttribute('opacity', '0');
      if (pieDividerJoin) pieDividerJoin.setAttribute('opacity', '0');
      return;
    }

    const xTop = cx;
    const yTop = cy - r;

    // Fatia cinza: progride de 270° até (270 - 72 * progress)
    const greyAngle = 270 - 72 * progress;
    const radGrey = (greyAngle * Math.PI) / 180;
    const xGrey = cx + r * Math.cos(radGrey);
    const yGrey = cy + r * Math.sin(radGrey);
    const dGrey = `M ${cx} ${cy} L ${xTop.toFixed(2)} ${yTop.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${xGrey.toFixed(2)} ${yGrey.toFixed(2)} Z`;
    if (pieSliceGrey) pieSliceGrey.setAttribute('d', dGrey);

    // Fatia branca: progride de 270° até (270 + 288 * progress)
    const whiteSweep = 288 * progress;
    const whiteAngle = 270 + whiteSweep;
    const radWhite = (whiteAngle * Math.PI) / 180;
    const xWhite = cx + r * Math.cos(radWhite);
    const yWhite = cy + r * Math.sin(radWhite);
    const largeArc = whiteSweep > 180 ? 1 : 0;
    const dWhite = `M ${cx} ${cy} L ${xTop.toFixed(2)} ${yTop.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${xWhite.toFixed(2)} ${yWhite.toFixed(2)} Z`;
    if (pieSliceWhite) pieSliceWhite.setAttribute('d', dWhite);

    // Linha divisória vertical superior (12 horas / 270°)
    if (pieDividerTop) {
      pieDividerTop.setAttribute('x1', String(cx));
      pieDividerTop.setAttribute('y1', String(cy));
      pieDividerTop.setAttribute('x2', xTop.toFixed(2));
      pieDividerTop.setAttribute('y2', yTop.toFixed(2));
      pieDividerTop.setAttribute('opacity', progress > 0.05 ? '1' : '0');
    }

    // Linha divisória de encontro (198°): surge suavemente na conclusão
    if (pieDividerJoin) {
      if (progress > 0.85) {
        const joinOpacity = Math.min(1, (progress - 0.85) / 0.15).toFixed(2);
        const rad198 = (198 * Math.PI) / 180;
        const x198 = cx + r * Math.cos(rad198);
        const y198 = cy + r * Math.sin(rad198);
        pieDividerJoin.setAttribute('x1', String(cx));
        pieDividerJoin.setAttribute('y1', String(cy));
        pieDividerJoin.setAttribute('x2', x198.toFixed(2));
        pieDividerJoin.setAttribute('y2', y198.toFixed(2));
        pieDividerJoin.setAttribute('opacity', joinOpacity);
      } else {
        pieDividerJoin.setAttribute('opacity', '0');
      }
    }
  }

  // Comprimentos para animação por strokeDashoffset
  // Vertical axis: 107px | Horizontal baseline: 206px | Constant line: 198px | Curve: 222.1px
  const lenVertical = 107;
  const lenHorizontal = 206;
  const lenConstant = 198;
  const lenCurve = 222.1;

  if (axisVertical) {
    axisVertical.style.strokeDasharray = `${lenVertical}`;
    axisVertical.style.strokeDashoffset = `${lenVertical}`;
  }
  if (axisHorizontal) {
    axisHorizontal.style.strokeDasharray = `${lenHorizontal}`;
    axisHorizontal.style.strokeDashoffset = `${lenHorizontal}`;
  }
  if (lineConstant) {
    lineConstant.style.strokeDasharray = `${lenConstant}`;
    lineConstant.style.strokeDashoffset = `${lenConstant}`;
  }
  if (curveGrowth) {
    curveGrowth.style.strokeDasharray = `${lenCurve}`;
    curveGrowth.style.strokeDashoffset = `${lenCurve}`;
  }

  // Define estado final fixo para prefers-reduced-motion ou reuso
  function setFinalState() {
    updatePie(1, 1);
    if (axisVertical) axisVertical.style.strokeDashoffset = '0';
    if (dotVertical) { dotVertical.style.opacity = '1'; dotVertical.style.transform = 'none'; }
    if (axisHorizontal) axisHorizontal.style.strokeDashoffset = '0';
    if (dotHorizontal) { dotHorizontal.style.opacity = '1'; dotHorizontal.style.transform = 'none'; }
    if (lineConstant) lineConstant.style.strokeDashoffset = '0';
    if (arrowConstant) { arrowConstant.style.opacity = '1'; arrowConstant.style.transform = 'none'; }
    if (curveGrowth) curveGrowth.style.strokeDashoffset = '0';
    if (curveArrow) { curveArrow.style.opacity = '1'; curveArrow.style.transform = 'none'; }
    if (labelCusto) { labelCusto.style.opacity = '1'; labelCusto.style.transform = 'none'; }
    if (labelTempo) { labelTempo.style.opacity = '1'; labelTempo.style.transform = 'none'; }
    if (chartLegend) { chartLegend.style.opacity = '1'; chartLegend.style.transform = 'none'; }
    chartsWrap.style.opacity = '1';
    chartsWrap.style.transform = 'none';
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    setFinalState();
    chartsWrap.dataset.chartState="static";
    return;
  }

  // Prepara estado inicial antes da ativação
  updatePie(0, 0.35);
  if (dotVertical) { dotVertical.style.opacity = '0'; }
  if (dotHorizontal) { dotHorizontal.style.opacity = '0'; }
  if (arrowConstant) { arrowConstant.style.opacity = '0'; }
  if (curveArrow) { curveArrow.style.opacity = '0'; }
  if (labelCusto) { labelCusto.style.opacity = '0'; labelCusto.style.transform = 'translateY(4px)'; }
  if (labelTempo) { labelTempo.style.opacity = '0'; labelTempo.style.transform = 'translateY(4px)'; }
  if (chartLegend) { chartLegend.style.opacity = '0'; chartLegend.style.transform = 'translateY(4px)'; }
  chartsWrap.style.opacity = '0';
  chartsWrap.style.transform = 'translateY(8px)';

  // Visibility is based on the charts, not the much taller parent section.
  const tl = gsap.timeline({paused:true,onComplete:()=>{chartsWrap.dataset.chartState='completed';}});
  window.__devmodeChartsTimeline = tl;

  // 1. Entrada suave do contêiner (0 a 400 ms)
  tl.to(chartsWrap, {
    opacity: 1,
    y: 0,
    duration: 0.25,
    ease: 'power2.out',
  }, 0);

  // 2. Preenchimento progressivo do gráfico de pizza (200 a 1100 ms)
  const pieAnim = { progress: 0, scale: 0.35 };
  tl.to(pieAnim, {
    progress: 1,
    scale: 1,
    duration: 0.9,
    ease: 'power2.out',
    onUpdate: () => updatePie(pieAnim.progress, pieAnim.scale),
  }, 0.2);

  // 3. Eixos e linha constante (400 a 1000 ms)
  // Eixo vertical: surge de baixo para cima (400 a 750 ms)
  if (axisVertical) {
    tl.to(axisVertical, {
      strokeDashoffset: 0,
      duration: 0.35,
      ease: 'power2.out',
    }, 0.4);
  }
  if (dotVertical) {
    tl.to(dotVertical, {
      opacity: 1,
      duration: 0.18,
      ease: 'power1.out',
    }, 0.72);
  }

  // Eixo horizontal: cresce da esquerda para a direita (450 a 950 ms)
  if (axisHorizontal) {
    tl.to(axisHorizontal, {
      strokeDashoffset: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, 0.45);
  }
  if (dotHorizontal) {
    tl.to(dotHorizontal, {
      opacity: 1,
      duration: 0.18,
      ease: 'power1.out',
    }, 0.92);
  }

  // Linha constante (Criação do Site): cresce da esquerda para a direita (500 a 1000 ms)
  if (lineConstant) {
    tl.to(lineConstant, {
      strokeDashoffset: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, 0.5);
  }
  if (arrowConstant) {
    tl.to(arrowConstant, {
      opacity: 1,
      duration: 0.18,
      ease: 'power1.out',
    }, 0.96);
  }

  // Textos e legenda: fade-in discreto a partir de 600 ms
  const textElements = [labelCusto, labelTempo, chartLegend].filter(Boolean);
  if (textElements.length > 0) {
    tl.to(textElements, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.1,
      ease: 'power2.out',
    }, 0.6);
  }

  // 4. Curva de crescimento exponencial (900 a 2100 ms)
  if (curveGrowth) {
    tl.to(curveGrowth, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power2.out',
    }, 0.9);
  }

  // Seta final tangencial surge quando o traçado alcança o topo direito (2000 a 2150 ms)
  if (curveArrow) {
    tl.to(curveArrow, {
      opacity: 1,
      duration: 0.18,
      ease: 'power1.out',
    }, 2.0);
  }

  // 5. Revelação final dos brilhos e detalhes (1800 a 2300 ms)
  if (pieGlowBlur && curveGlowBlur) {
    tl.to([pieGlowBlur, curveGlowBlur], {
      attr: { stdDeviation: 2.8 },
      duration: 0.5,
      ease: 'power1.out',
    }, 1.8);
  }

  let observer=null,resizeFrame=0,version=0,armed=true,destroyed=false,run=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function reset(){
    tl.pause(0);
    pieAnim.progress=0;pieAnim.scale=.35;updatePie(0,.35);
    for(const [element,length] of [[axisVertical,lenVertical],[axisHorizontal,lenHorizontal],[lineConstant,lenConstant],[curveGrowth,lenCurve]])if(element)gsap.set(element,{strokeDashoffset:length});
    gsap.set([dotVertical,dotHorizontal,arrowConstant,curveArrow].filter(Boolean),{opacity:0});
    gsap.set([labelCusto,labelTempo,chartLegend].filter(Boolean),{opacity:0,y:4});
    gsap.set(chartsWrap,{opacity:0,y:8});chartsWrap.dataset.chartState='waiting';
  }
  function observe(){
    resizeFrame=0;if(destroyed)return;observer?.disconnect();const current=++version;
    if(motion.matches){tl.pause();setFinalState();chartsWrap.dataset.chartState='static';return;}
    const top=Math.max(0,document.querySelector('header')?.getBoundingClientRect().bottom||0)+12;
    const blur=document.getElementById('bottomProgressiveBlur');
    const bottom=(blur&&getComputedStyle(blur).display!=='none'?blur.getBoundingClientRect().height:0)+16;
    observer=new IntersectionObserver(entries=>{
      if(destroyed||current!==version)return;
      const entry=entries[0];
      if(armed&&entry.isIntersecting&&entry.intersectionRatio>=.55){
        armed=false;reset();chartsWrap.dataset.chartRun=String(++run);chartsWrap.dataset.chartState='playing';tl.invalidate().restart();
      }
    },{rootMargin:`-${top}px 0px -${bottom}px 0px`,threshold:[0,.55]});
    observer.observe(chartsWrap);
  }
  function resize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(observe);}
  function preference(){armed=true;if(!motion.matches)reset();resize();}
  window.addEventListener('resize',resize,{passive:true});window.addEventListener('praxis:hero-layout',resize);motion.addEventListener('change',preference);
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(chartsWrap);
  const fullViewportObserver=new IntersectionObserver(entries=>{
    if(destroyed||motion.matches||entries[0].isIntersecting)return;
    const r=chartsWrap.getBoundingClientRect();
    if(r.bottom<=0||r.top>=innerHeight){armed=true;reset();}
  },{threshold:0});
  fullViewportObserver.observe(chartsWrap);
  const api={timeline:tl,destroy(){destroyed=true;version++;observer?.disconnect();fullViewportObserver.disconnect();sizeObserver.disconnect();cancelAnimationFrame(resizeFrame);window.removeEventListener('resize',resize);window.removeEventListener('praxis:hero-layout',resize);motion.removeEventListener('change',preference);tl.kill();setFinalState();delete chartsWrap.devmodeCharts;}};
  chartsWrap.devmodeCharts=api;resize();import.meta.hot?.dispose(()=>api.destroy());return api;

}
