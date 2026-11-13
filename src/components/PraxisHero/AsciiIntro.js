import { AsciiGlyphAtlas } from '../../lib/hero/asciiGlyphAtlas.js';
import { INTRO_DURATION,clamp,smooth,random,quadratic,phaseAt,sampleMonitor } from '../../lib/hero/asciiParticles.js';

export class AsciiIntro {
  constructor({host,surface,video,reduced=false,onState=()=>{},awaitTitle=false}) {
    this.host=host;this.surface=surface;this.video=video;this.reduced=reduced;this.onState=onState;
    this.entryAllowed=!awaitTitle;
    this.entered=false;this.state='waiting';this.progress=0;this.visible=false;this.running=false;this.run=0;this.generation=0;
    this.cache=new Map();this.points=[];this.builds=0;this.raf=0;this.completionRaf=0;this.destroyed=false;
    this.canvas=document.createElement('canvas');this.canvas.className='praxis-ascii-overlay';this.canvas.setAttribute('aria-hidden','true');
    this.ctx=this.canvas.getContext('2d',{alpha:true});
    this.sentinel=document.createElement('span');this.sentinel.className='praxis-ascii-sentinel';this.sentinel.setAttribute('aria-hidden','true');
    Object.assign(this.sentinel.style,{left:'-10000px',top:'-10000px',width:'1px',height:'1px'});
    host.dataset.introState='waiting';
    host.append(this.canvas,this.sentinel);this.present(0);
    this.intersection=new IntersectionObserver(entries=>{
      const entry=entries[0],visible=entry.isIntersecting&&entry.intersectionRect.width>5&&entry.intersectionRect.height>5;
      if(visible===this.visible)return;this.visible=visible;
      document.documentElement.classList.toggle('praxis-hero-in-view',visible);
      if(visible)this.maybeStart();else this.reset();
    },{threshold:[0,.01]});
    this.intersection.observe(this.sentinel);
    this.visibility=()=>{if(document.hidden)this.reset();else this.maybeStart();};
    document.addEventListener('visibilitychange',this.visibility);
    const rnd=random(14350);
    this.dust=Array.from({length:90},(_,i)=>({side:i%2?-1:1,x:rnd()*.2,y:rnd(),rate:rnd()*.3+.15,char:'·:+01/\\*'[Math.floor(rnd()*8)],phase:rnd()*6.28}));
  }
  setState(state) {
    if(state===this.state)return;
    this.state=state;this.host.dataset.introState=state;
    // This is the only path that can grant video playback authorization.
    void this.video.setIntroState(state);this.onState();
  }
  resize(width,height,dpr) {
    const overlayDpr=Math.min(dpr||1,1,Math.sqrt(2100000/(width*height)));
    if(width===this.width&&height===this.height&&overlayDpr===this.dpr)return;
    this.width=width;this.height=height;
    // Small moving characters need CSS-pixel resolution, not a full Retina
    // surface. Bound only this temporary overlay; the real frame stays HD.
    this.dpr=overlayDpr;
    this.atlas?.destroy();this.atlas=null;
    this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    this.cell=null;this.cache.clear();
  }
  setReducedMotion(value) {
    if(value===this.reduced)return;this.reduced=value;
    if(value&&this.scene&&this.visible){this.cancelFrames();this.setState('revealing-monitor');this.present(1);this.finishAfterPaint();}
  }
  updateScene(scene) {
    this.scene=scene;
    const xs=scene.corners.map(p=>p[0]),ys=scene.corners.map(p=>p[1]);
    Object.assign(this.sentinel.style,{left:`${Math.min(...xs)}px`,top:`${Math.min(...ys)}px`,width:`${Math.max(...xs)-Math.min(...xs)}px`,height:`${Math.max(...ys)-Math.min(...ys)}px`});
    if(this.running)this.prepare();
    this.maybeStart();
  }
  prepare() {
    if(!this.scene)return;
    this.cell??=(this.width<600?10:8.5)/this.scene.layout.scale;
    const key=`${this.scene.frame}/${this.cell}`;
    if(!this.cache.has(key)){
      this.cache.set(key,sampleMonitor(this.scene.image,this.scene.sourceCorners,this.cell,this.width<600?1800:6000));this.builds++;
      while(this.cache.size>4)this.cache.delete(this.cache.keys().next().value);
    }
    this.points=this.cache.get(key);
    // No atlas writes during particle blits: those force costly texture uploads.
    this.atlas??=new AsciiGlyphAtlas(this.dpr);
    const sizes=new Set();
    for(const point of this.points)for(const stride of [1,2,3])sizes.add(Math.max(6,Math.round(this.cell*this.scene.layout.scale*point.font*Math.sqrt(stride))));
    this.atlas.warm(sizes);
    this.leftCount=this.points.filter(p=>p.side<0).length;this.rightCount=this.points.length-this.leftCount;
  }
  maybeStart() {
    if(!this.entryAllowed||this.destroyed||!this.visible||document.hidden||!this.scene||this.running||this.completionRaf||this.state==='completed')return;
    this.cancelFrames();
    const skip=this.reduced||this.entered;
    if(!this.entered){this.entered=true;this.run++;}
    this.progress=0;this.canvas.hidden=false;
    if(skip){this.setState('revealing-monitor');this.present(1);this.finishAfterPaint();return;}
    try{this.prepare();}catch(error){
      this.error=error.message;this.setState('revealing-monitor');this.present(1);this.finishAfterPaint();return;
    }
    this.drawStep=1;this.frameAverage=16.7;this.lastTick=0;
    this.running=true;this.setState('ascii-forming');this.present(0);this.started=performance.now();
    const generation=this.generation;
    const tick=now=>{
      this.raf=0;if(this.destroyed||generation!==this.generation||!this.running)return;
      if(this.lastTick)this.frameAverage=this.frameAverage*.8+(now-this.lastTick)*.2;
      this.lastTick=now;
      this.progress=clamp((now-this.started)/INTRO_DURATION);
      // Adapt early, before the silhouette settles. Keep targets and geometry fixed.
      if(this.progress<.45&&this.frameAverage>34)this.drawStep=Math.max(this.drawStep,this.frameAverage>50?3:2);
      const phase=phaseAt(this.progress);
      if(phase!=='completed')this.setState(phase);
      this.present(smooth(.71,.95,this.progress));this.draw(this.progress);
      if(this.progress>=1){this.running=false;this.finishAfterPaint();}
      else this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }
  present(alpha) {
    this.reveal=alpha;this.surface.canvas.style.opacity=String(alpha);this.video.layer.style.opacity=String(alpha);
  }
  draw(t) {
    const c=this.ctx,w=this.width,h=this.height,layout=this.scene.layout;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    const field=smooth(.06,.21,t)*(1-smooth(.51,.84,t));
    if(field>.01){
      c.save();c.strokeStyle=`rgba(62,124,26,${field*.13})`;c.lineWidth=1;c.setLineDash([2,11]);
      for(const side of [-1,1])for(let j=0;j<3;j++){
        c.beginPath();c.moveTo(side<0?-w*.14:w*1.14,h*(.23+j*.22));c.quadraticCurveTo(w*.5,h*(.26+j*.18),w*.5,h*.5);c.stroke();
      }c.restore();
    }
    c.textAlign='center';c.textBaseline='middle';
    if(t<.96)for(let i=0;i<this.points.length;i+=this.drawStep||1){
      const a=this.points[i];if(t<a.start)continue;
      const tx=layout.x+a.x*layout.scale,ty=layout.y+a.y*layout.scale;
      if(ty<-80||ty>h+80||tx<-80||tx>w+80)continue;
      const u=clamp((t-a.start)/a.duration),e=1-Math.pow(1-u,4);
      const sx=a.side<0?-45-a.origin*w*.33:w+45+a.origin*w*.33;
      const sy=ty+a.vertical*h*.85,cx=(sx+tx)*.49+a.side*a.curve*120,cy=ty+a.bend*h*.85;
      const resonance=(1-u)*Math.sin(11*u+a.phase)*7;
      const x=quadratic(sx,cx,tx,e)+a.side*resonance,y=quadratic(sy,cy,ty,e)+resonance*.67;
      const opacity=smooth(0,.17,u)*a.alpha*(1-smooth(.78,.96,t));if(opacity<.01)continue;
      const band=a.dark>.72?0:a.dark>.33?1:2,size=Math.max(6,Math.round(this.cell*layout.scale*a.font*Math.sqrt(this.drawStep||1)));
      const glitch=u<.85&&Math.sin(t*60+a.phase)>.70;
      this.atlas??=new AsciiGlyphAtlas(this.dpr);
      this.atlas.draw(c,glitch?'#%&/01+'[Math.floor((i+t*70)%7)]:a.char,size,band,x,y,opacity);
    }
    c.globalAlpha=1;
    const dust=smooth(0,.20,t)*(1-smooth(.38,.72,t));
    if(dust>.01){c.font='10px "Courier New",monospace';c.fillStyle=`rgba(29,34,28,${dust*.16})`;
      for(const d of this.dust){const x=d.side<0?d.x*w:w-d.x*w;c.fillText(d.char,x-d.side*w*smooth(.1,.72,t)*d.rate,d.y*h+Math.sin(t*10+d.phase)*17*(1-t));}
    }
  }
  finishAfterPaint() {
    this.atlas?.destroy();this.atlas=null;
    this.present(1);this.canvas.hidden=true;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const generation=this.generation;
    // Two RAF boundaries ensure the fully revealed raster was painted before play().
    this.completionRaf=requestAnimationFrame(()=>{
      this.completionRaf=requestAnimationFrame(()=>{
        this.completionRaf=0;
        if(this.destroyed||generation!==this.generation||!this.visible||document.hidden)return;
        this.progress=1;this.setState('completed');
      });
    });
  }
  cancelFrames(){this.generation++;cancelAnimationFrame(this.raf);cancelAnimationFrame(this.completionRaf);this.raf=0;this.completionRaf=0;this.running=false;}
  reset(){
    this.cancelFrames();this.progress=0;this.setState('waiting');
    // Leaving the aperture only suspends playback. The entry intro must never
    // hide the original monitor again, including when interrupted by scrolling.
    this.present(this.entered?1:0);this.canvas.hidden=true;
  }
  getState(){return {state:this.state,progress:this.progress,run:this.run,entered:this.entered,visible:this.visible,running:this.running,rafActive:Boolean(this.raf||this.completionRaf),reveal:this.reveal,particles:this.points.length,renderStride:this.drawStep||1,renderedParticles:Math.ceil(this.points.length/(this.drawStep||1)),left:this.leftCount||0,right:this.rightCount||0,builds:this.builds,frame:this.scene?.frame,error:this.error||null};}
  destroy(){document.documentElement.classList.remove('praxis-hero-in-view');this.destroyed=true;this.cancelFrames();this.intersection.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.cache.clear();this.atlas?.destroy();this.canvas.remove();this.sentinel.remove();}
}
