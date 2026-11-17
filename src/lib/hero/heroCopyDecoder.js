const SYMBOLS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/+';
export class HeroCopyDecoder {
  constructor(element){
    this.element=element;if(!element)return;
    this.original=element.textContent;this.words=[];this.raf=0;this.timer=0;this.cycles=0;this.entered=false;this.visible=false;this.destroyed=false;
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    element.textContent='';
    const accessible=document.createElement('span');accessible.className='visually-hidden';accessible.textContent=this.original;element.append(accessible);
    const tokens=document.documentElement.lang.startsWith('zh')?(typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(this.original),item=>item.segment):Array.from(this.original)):this.original.split(/(\s+)/);
    for(const token of tokens){
      if(!token.trim()){element.append(document.createTextNode(token));continue;}
      const word=document.createElement('span');word.className='hero-copy-word';word.setAttribute('aria-hidden','true');
      const ghost=document.createElement('span');ghost.className='hero-copy-ghost';ghost.textContent=token;
      const glyph=document.createElement('span');glyph.className='hero-copy-glyph';glyph.textContent=token;word.append(ghost,glyph);element.append(word);this.words.push({glyph,text:token});
    }
    this.visibility=()=>{this.stop();if(this.eligible())this.start();};
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.visibility();},{threshold:0});this.observer.observe(element);
    document.addEventListener('visibilitychange',this.visibility);this.motion.addEventListener('change',this.visibility);
    element.copyDecoder=this;
  }
  eligible(){return this.visible&&!document.hidden&&!this.motion.matches&&!this.destroyed;}
  scramble(word){word.glyph.textContent=Array.from(word.text,c=>/[.,;:!?]/.test(c)?c:SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]).join('');}
  restore(){this.words.forEach(w=>{if(w.glyph.textContent!==w.text)w.glyph.textContent=w.text;w.glyph.style.color='';});}
  stop(){clearTimeout(this.timer);cancelAnimationFrame(this.raf);this.timer=this.raf=0;this.restore();if(this.element)this.element.dataset.decodeState='idle';}
  arm(){if(this.eligible())this.timer=setTimeout(()=>this.pulse(),3500+Math.random()*3500);}
  start(){if(!this.entered){this.entered=true;this.animate(true);}else this.arm();}
  pulse(){if(!this.eligible())return;clearTimeout(this.timer);this.animate(false);}
  periodicWords(){
    // Measure the current wrapped lines only once per cycle, never per tick.
    // Re-reading here follows font/layout changes without another resize loop.
    const lines=[];let leadingCount=0;
    for(const word of this.words){
      const top=word.glyph.parentElement.offsetTop;
      if(!lines.some(y=>Math.abs(y-top)<1))lines.push(top);
      if(lines.length>3)break;
      leadingCount++;
    }
    const pool=Math.random()<.85?Math.max(1,leadingCount):this.words.length;
    const count=Math.min(pool,8+Math.floor(Math.random()*9));
    const start=Math.floor(Math.random()*(pool-count+1));
    return this.words.slice(start,start+count);
  }
  animate(entry){
    this.stop();if(!this.eligible())return;
    const selected=entry?this.words:this.periodicWords(),duration=entry?2800:1150;
    selected.forEach(w=>this.scramble(w));this.element.dataset.decodeState=entry?'entering':'decoding';
    if(!entry)this.cycles++;
    const began=performance.now();let last=0,resolved=0;
    const tick=now=>{
      this.raf=0;if(!this.eligible()){this.stop();return;}
      const progress=Math.min(1,(now-began)/duration);
      if(now-last>=50||progress===1){
        last=now;const next=Math.floor(progress*selected.length);
        while(resolved<next){const w=selected[resolved++];w.glyph.textContent=w.text;}
        // Limit writes to a small moving window even during the full entrance.
        for(let i=resolved;i<Math.min(selected.length,resolved+18);i++)this.scramble(selected[i]);
      }
      if(progress<1)this.raf=requestAnimationFrame(tick);else{this.restore();this.element.dataset.decodeState='idle';this.arm();}
    };
    this.raf=requestAnimationFrame(tick);
  }
  destroy(){if(!this.element)return;this.destroyed=true;this.stop();this.observer?.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.motion?.removeEventListener('change',this.visibility);this.element.textContent=this.original;this.element.removeAttribute('aria-label');delete this.element.dataset.decodeState;delete this.element.copyDecoder;}
}
