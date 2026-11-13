import './PraxisHero.css';
import { FrameLoader } from '../../lib/hero/frameLoader.js';
import { frameFromProgress,layoutAtProgress,viewportCorners } from '../../lib/hero/geometry.js';
import { createScrollController } from '../../lib/hero/scrollController.js';
import { FrameCanvas } from './FrameCanvas.js';
import { ScreenVideo } from './ScreenVideo.js';
import { AsciiIntro } from './AsciiIntro.js';
import { createDebug } from './HeroDebug.js';
import { HeroTextDecoder } from './HeroTextDecoder.js';
import { layoutHeroCopy } from '../../lib/hero/heroCopyLayout.js';
import { HeroCopyDecoder } from '../../lib/hero/heroCopyDecoder.js';
import { initHeroRailsDecoder } from '../../lib/hero/heroRailsDecoder.js';
const BASE='/assets/praxis-hero';
export class PraxisHero {
  constructor(section){
    this.section=section;this.progress=0;this.manual=null;this.requested=-1;this.drawn=-1;this.lastKey='';this.alive=true;
    this.bottomBlur=document.getElementById('bottomProgressiveBlur');
    this.previousBlurIntensity=this.bottomBlur?.style.getPropertyValue('--praxis-hero-blur-intensity')||'';
    this.updateBottomBlur(0);
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    // The rest of Praxis is scaled by its existing 1440px artboard. Move the
    // hero outside that transformed ancestor so pinning uses viewport pixels.
    this.originalParent=section.parentElement;this.originalNext=section.nextSibling;
    if(this.originalParent.classList.contains('site-wrapper')){
      this.originalParent.classList.add('praxis-hero-detached');this.originalParent.before(section);
    }
    section.praxisHero=this;
    section.classList.add('praxis-hero');
    section.querySelector('#heroMonitorContainer')?.remove();
    this.viewport=document.createElement('div');this.viewport.className='praxis-hero-viewport';
    this.artboard=document.createElement('div');this.artboard.className='praxis-hero-artboard';
    while(section.firstChild)this.artboard.append(section.firstChild);
    this.viewport.append(this.artboard);section.append(this.viewport);
    this.surface=new FrameCanvas(this.viewport);
    this.video=new ScreenVideo(this.viewport,BASE,this.motionQuery.matches);
    this.intro=new AsciiIntro({host:this.viewport,surface:this.surface,video:this.video,reduced:this.motionQuery.matches,awaitTitle:true,onState:()=>this.schedule()});
    this.loader=new FrameLoader({base:`${BASE}/frames-hd-line-mask`,limit:16,onChange:()=>this.schedule()});
    this.debug=createDebug(this);
    this.textLayer=this.artboard.querySelector('.hero-sticky-text-layer');
    this.textDecoder=new HeroTextDecoder(this.textLayer,{prefersReducedMotion:this.motionQuery.matches,onDecodeComplete:()=>{
      if(this.intro.entryAllowed||this.monitorEntranceTimer)return;
      this.monitorEntranceTimer=setTimeout(()=>{
        this.monitorEntranceTimer=0;if(!this.alive)return;
        this.intro.entryAllowed=true;this.intro.maybeStart();
      },this.motionQuery.matches?0:300);
    }});
    this.copyDecoder=new HeroCopyDecoder(this.textLayer.querySelector('.hero-intro-copy'));
    this.destroyRailsDecoder=initHeroRailsDecoder(this.artboard);
    document.fonts.ready.then(()=>{if(this.alive)layoutHeroCopy(this.artboard,this.viewport,this.headerInset||0);});
    this.scrollHandler=()=>this.updateRetention();
    window.addEventListener('scroll',this.scrollHandler,{passive:true});
    this.resize=()=>this.configure();this.motionQuery.addEventListener('change',this.resize);
    this.observer=new ResizeObserver(()=>this.configure());this.observer.observe(section);
    window.addEventListener('resize',this.resize,{passive:true});
    this.status=document.createElement('span');this.status.className='praxis-hero-status';this.status.setAttribute('role','status');this.status.textContent='Carregando monitor…';this.viewport.append(this.status);
    this.ready=this.init();
  }
  async init(){
    try{
      const results=await Promise.all(['screen-corners.json','hero-motion.json','desk-bounds.json'].map(async f=>{const r=await fetch(`${BASE}/${f}`);if(!r.ok)throw new Error(f);return r.json();}));
      if(!this.alive)return;[this.corners,this.motion,this.desk]=results;this.configure();
    }catch(e){this.status.textContent='Não foi possível carregar a animação do monitor.';console.error('Praxis hero metadata unavailable',e);}
  }
  configure(){
    if(!this.motion||!this.alive)return;
    const width=document.documentElement.clientWidth,height=window.innerHeight;
    const staticMode=width<768||this.motionQuery.matches;
    const key=`${width}/${height}/${devicePixelRatio}/${staticMode}`;if(key===this.sizeKey)return;this.sizeKey=key;
    // Refresh restores the pin's captured inline height. Recreate only our
    // trigger on real viewport/motion changes, before applying new dimensions.
    this.trigger?.kill(true);this.trigger=null;
    this.width=width;this.height=height;this.staticMode=staticMode;
    this.headerInset=Math.max(0,document.getElementById('siteHeader')?.getBoundingClientRect().bottom||0);
    this.loader.limit=width<768?4:16;this.loader.evict();
    this.viewport.style.height=`${height}px`;
    this.artboard.style.setProperty('--art-scale',width>1024?width/1440:1);
    this.surface.resize(width,height);this.lastKey='';
    this.intro.resize(width,height,this.surface.dpr);
    layoutHeroCopy(this.artboard,this.viewport,this.headerInset);
    void this.video.setReducedMotion(this.motionQuery.matches);
    this.intro.setReducedMotion(this.motionQuery.matches);
    if(staticMode){this.trigger?.kill(true);this.trigger=null;this.progress=0;if(this.textLayer)this.textLayer.style.transform='';}
    else if(!this.trigger)this.trigger=createScrollController(this.section,this.viewport,p=>{this.progress=p;this.updateBottomBlur(p);this.schedule();},()=>this.updateRetention());
    else this.trigger.refresh();
    this.updateRetention();
    window.dispatchEvent(new Event('praxis:hero-layout'));this.schedule();
  }
  updateBottomBlur(progress){
    if(!this.bottomBlur)return;
    const intensity='1';
    if(intensity===this.blurIntensity)return;
    this.blurIntensity=intensity;
    this.bottomBlur.style.setProperty('--praxis-hero-blur-intensity',intensity);
  }
  updateRetention(){
    if(!this.textLayer||this.staticMode)return;
    const scrollY=this.trigger?.smoother?.scroll??window.scrollY??0;
    const pinEnd=this.trigger?.end;
    if(typeof pinEnd!=='number')return;
    const retentionDistance=this.height;
    const artScale=this.width>1024?this.width/1440:1;
    if(scrollY>=pinEnd&&scrollY<=pinEnd+retentionDistance){
      const deltaY=scrollY-pinEnd;
      this.textLayer.style.transform=`translate3d(0, ${(deltaY/artScale).toFixed(2)}px, 0)`;
    }else if(scrollY>pinEnd+retentionDistance){
      this.textLayer.style.transform=`translate3d(0, ${(retentionDistance/artScale).toFixed(2)}px, 0)`;
    }else{
      this.textLayer.style.transform='';
    }
  }
  schedule(){if(!this.alive||this.raf)return;this.raf=requestAnimationFrame(()=>{this.raf=0;this.render();});}
  render(){
    if(!this.motion)return;
    this.updateBottomBlur(this.manual===null?this.progress:this.manual/88);
    const target=this.manual??(this.staticMode?44:frameFromProgress(this.progress));
    if(target!==this.requested){this.requested=target;this.loader.request(target);}
    // A requested compressed frame may have arrived while a different target
    // was active; schedule its decode without refetching the compressed blob.
    if(!this.loader.decoded.has(target)&&!this.loader.pending.has(target)&&!this.loader.failed.has(target))this.loader.request(target);
    const actual=this.loader.nearest(target);
    if(actual<0){if(this.loader.failed.size===89)this.status.textContent='Imagens do monitor indisponíveis.';return;}
    const progress=this.manual===null?this.progress:target/88;
    const layout=layoutAtProgress(this.motion,progress,this.width,this.height,this.staticMode,this.headerInset,this.corners.frames[String(actual).padStart(5,'0')],this.desk.frames[actual]);
    const corners=viewportCorners(this.corners.frames[String(actual).padStart(5,'0')],layout);
    const key=[actual,layout.scale,layout.x,layout.y,Boolean(this.showCorners)].join('/');
    if(key!==this.lastKey){
      this.videoMatrix=this.video.project(corners,layout.scale);
      this.surface.draw(this.loader.decoded.get(actual),layout,corners,this.showCorners);
      this.lastKey=key;this.drawn=actual;
      this.intro.updateScene({image:this.loader.decoded.get(actual),layout,corners,
        sourceCorners:this.corners.frames[String(actual).padStart(5,'0')],frame:actual});
    }
    this.updateRetention();
    this.status.textContent=this.loader.failed.size?`${this.loader.failed.size} quadro(s) indisponível(is); exibindo o quadro válido mais próximo.`:'';
    this.state={progress:this.progress,expected:target,drawn:actual,available:this.loader.blobs.size,decoded:this.loader.decoded.size,failed:[...this.loader.failed],filename:`db-hero_${String(actual).padStart(5,'0')}.webp`,canvas:[this.surface.canvas.width,this.surface.canvas.height],viewport:[this.width,this.height],dpr:this.surface.dpr,scale:layout.scale,offset:[layout.x,layout.y],screenCorners:corners,corners:this.video.quad,matrix:this.videoMatrix,intro:this.intro.getState(),video:{allowed:this.video.gate.allowed,paused:this.video.video.paused,time:this.video.video.currentTime,ready:this.video.video.readyState,error:this.video.error||null},pin:{active:this.trigger?.isActive||false,start:this.trigger?.start??null,end:this.trigger?.end??null},staticMode:this.staticMode};
    this.surface.canvas.dataset.expected=target;this.surface.canvas.dataset.drawn=actual;
    this.debug?.update(this.state);
  }
  destroy(){
    this.alive=false;cancelAnimationFrame(this.raf);this.trigger?.kill(true);this.observer.disconnect();window.removeEventListener('resize',this.resize);this.motionQuery.removeEventListener('change',this.resize);
    if(this.bottomBlur){
      if(this.previousBlurIntensity)this.bottomBlur.style.setProperty('--praxis-hero-blur-intensity',this.previousBlurIntensity);
      else this.bottomBlur.style.removeProperty('--praxis-hero-blur-intensity');
    }
    this.textDecoder?.destroy();
    if(this.scrollHandler)window.removeEventListener('scroll',this.scrollHandler);
    if(this.textLayer)this.textLayer.style.transform='';
    clearTimeout(this.monitorEntranceTimer);this.destroyRailsDecoder();this.copyDecoder.destroy();this.intro.destroy();this.loader.destroy();this.video.destroy();this.surface.destroy();this.debug?.destroy();
    while(this.artboard.firstChild)this.section.append(this.artboard.firstChild);
    this.viewport.remove();this.section.classList.remove('praxis-hero');
    this.originalParent.classList.remove('praxis-hero-detached');
    if(this.originalParent.isConnected)this.originalParent.insertBefore(this.section,this.originalNext?.parentElement===this.originalParent?this.originalNext:null);
    delete this.section.praxisHero;window.dispatchEvent(new Event('praxis:hero-layout'));
  }
}
export function initPraxisHero(){
  const section=document.getElementById('inicio');if(!section)return;
  if(section.praxisHero?.alive)return section.praxisHero;
  const hero=new PraxisHero(section);
  if(import.meta.env.DEV){window.__praxisHero=hero;window.__heroTextDecoder=hero.textDecoder;}
  import.meta.hot?.dispose(()=>hero.destroy());return hero;
}
