import { homography, cssMatrix, expandQuad } from '../../lib/hero/geometry.js';
import { VideoPlaybackGate } from '../../lib/hero/videoPlaybackGate.js';
export class ScreenVideo {
  constructor(host,base,reduced) {
    this.layer=document.createElement('div');this.layer.className='praxis-video-layer';
    this.video=document.createElement('video');
    Object.assign(this.video,{muted:true,autoplay:false,loop:true,playsInline:true,preload:reduced?'metadata':'auto'});
    this.video.style.visibility='hidden';
    this.video.setAttribute('aria-label','Showreel Word Films');this.video.src=`${base}/word-films-loop.mp4`;
    this.retry=document.createElement('button');this.retry.type='button';this.retry.className='praxis-video-retry';
    this.retry.textContent='Reproduzir vídeo';this.retry.hidden=true;
    this.layer.append(this.video,this.retry);host.append(this.layer);
    this.video.addEventListener('error',()=>{this.error='Vídeo indisponível';});
    this.gate=new VideoPlaybackGate(this.video,{reduced,
      onAllowed:allowed=>{this.video.style.visibility=allowed?'visible':'hidden';},
      onBlocked:blocked=>{this.retry.hidden=!blocked;},
      onError:error=>{this.error=error.message;},
    });
    this.retry.addEventListener('click',()=>{void this.gate.play();});
  }
  setIntroState(state){return this.gate.setState(state);}
  setReducedMotion(value){return this.gate.setReduced(value);}
  project(screenQuad,sourceScale) {
    // Two source pixels of bleed under the opaque inner bezel cover raster
    // sampling at the aperture edge. This does not transform the monitor.
    const quad=expandQuad(screenQuad,2*sourceScale);
    this.quad=quad;
    const matrix=homography(1600,900,quad);
    this.video.style.transform=cssMatrix(matrix);
    this.retry.style.transform=cssMatrix(matrix);
    this.layer.style.clipPath=`polygon(${quad.map(([x,y])=>`${x}px ${y}px`).join(',')})`;
    this.layer.style.visibility='visible';return matrix;
  }
  destroy(){this.gate.destroy();this.video.pause();this.video.removeAttribute('src');this.video.load();this.layer.remove();}
}
