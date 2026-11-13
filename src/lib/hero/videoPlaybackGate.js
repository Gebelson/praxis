// All programmatic video starts pass through this gate, including retries.
export class VideoPlaybackGate {
  constructor(video,{reduced=false,onAllowed=()=>{},onBlocked=()=>{},onError=()=>{}}={}) {
    this.video=video;this.reduced=reduced;this.allowed=false;this.state='waiting';this.generation=0;
    this.onAllowed=onAllowed;this.onBlocked=onBlocked;this.onError=onError;
    video.autoplay=false;video.pause();
    this.guard=()=>{if(!this.allowed||this.reduced)video.pause();};
    video.addEventListener('play',this.guard);
  }
  setState(state) {
    if(state===this.state)return Promise.resolve(false);
    this.state=state;this.generation++;
    this.allowed=state==='completed';this.onAllowed(this.allowed);this.onBlocked(false);
    if(!this.allowed){this.video.pause();return Promise.resolve(false);}
    return this.play();
  }
  setReduced(value) {
    if(value===this.reduced)return Promise.resolve(false);
    this.reduced=value;this.generation++;
    if(value){this.video.pause();return Promise.resolve(false);}
    return this.play();
  }
  async play() {
    if(!this.allowed||this.state!=='completed'||this.reduced)return false;
    const generation=this.generation;
    try {
      await this.video.play();
      if(generation!==this.generation||!this.allowed||this.reduced){this.video.pause();return false;}
      this.onBlocked(false);return true;
    }catch(error){
      if(generation!==this.generation)return false;
      if(error.name==='NotAllowedError')this.onBlocked(true);
      else if(error.name!=='AbortError')this.onError(error);
      return false;
    }
  }
  destroy(){this.allowed=false;this.generation++;this.video.pause();this.video.removeEventListener('play',this.guard);}
}
