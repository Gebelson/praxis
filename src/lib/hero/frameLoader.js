// Compressed blobs are retained; decoded surfaces are bounded and explicitly
// released. At most three fetch/decode operations execute concurrently.
export class FrameLoader {
  constructor({base,limit=14,onChange=()=>{}}) {
    this.base=base;this.limit=limit;this.onChange=onChange;
    this.blobs=new Map();this.decoded=new Map();this.failed=new Set();
    this.queue=[];this.pending=new Set();this.active=0;this.target=0;
    this.direction=1;this.runway=new Set();
    this.destroyed=false;this.abort=new AbortController();
  }
  request(index) {
    if(index!==this.target)this.direction=Math.sign(index-this.target);
    this.target=index;
    // Reserve most of the bounded cache ahead of travel. Decode it while
    // idle, rather than waiting until a frame is already due on screen.
    const ahead=Math.max(1,this.limit-4),order=[index];
    for(let n=1;n<=ahead;n++)order.push(index+n*this.direction);
    for(let n=1;n<=3;n++)order.push(index-n*this.direction);
    this.runway=new Set(order.filter(i=>i>=0&&i<89));
    order.push(0,11,22,33,44,55,66,77,88);
    for(let i=0;i<89;i++)order.push(i);
    this.queue=[...new Set(order)].filter(i=>i>=0&&i<89&&!this.failed.has(i)&&!this.pending.has(i)&&(!this.blobs.has(i)||this.runway.has(i)&&!this.decoded.has(i)));
    this.pump();
  }
  async decode(blob) {
    if(typeof createImageBitmap==='function') {
      try{return await createImageBitmap(blob);}catch{/* Safari/image codecs: HTMLImage fallback */}
    }
    const url=URL.createObjectURL(blob),img=new Image();img.src=url;
    try{await img.decode();return img;}finally{URL.revokeObjectURL(url);}
  }
  pump() {
    while(!this.destroyed&&this.active<3&&this.queue.length) {
      const index=this.queue.shift();this.pending.add(index);this.active++;
      this.load(index).finally(()=>{this.pending.delete(index);this.active--;this.pump();});
    }
  }
  async load(index) {
    try {
      let blob=this.blobs.get(index);
      if(!blob) {
        const r=await fetch(`${this.base}/db-hero_${String(index).padStart(5,'0')}.webp`,{signal:this.abort.signal});
        if(!r.ok) throw new Error(`Frame ${index}: HTTP ${r.status}`);
        blob=await r.blob();if(this.destroyed)return;this.blobs.set(index,blob);
      }
      if(this.runway.has(index)||!this.decoded.size) {
        const image=await this.decode(blob);
        if(this.destroyed){image.close?.();return;}
        this.decoded.get(index)?.close?.();this.decoded.set(index,image);this.evict();
      }
    } catch(e) {if(e.name!=='AbortError'){this.failed.add(index);console.warn('Praxis hero frame unavailable',index,e.message);}}
    if(!this.destroyed)this.onChange();
  }
  evict() {
    const keys=[...this.decoded.keys()].sort((a,b)=>Number(this.runway.has(a))-Number(this.runway.has(b))||Math.abs(b-this.target)-Math.abs(a-this.target));
    while(this.decoded.size>this.limit) {const i=keys.shift();this.decoded.get(i).close?.();this.decoded.delete(i);}
  }
  nearest(index) {
    let best=-1;
    for(const i of this.decoded.keys()) if(best<0||Math.abs(i-index)<Math.abs(best-index))best=i;
    return best;
  }
  destroy() {
    this.destroyed=true;this.abort.abort();this.queue=[];
    for(const img of this.decoded.values())img.close?.();this.decoded.clear();this.blobs.clear();
  }
}
