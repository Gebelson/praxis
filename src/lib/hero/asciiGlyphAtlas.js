// Prepare the atlas before playback; blit only each glyph's ink bounds.
const CHARACTERS=[...new Set('@#%X8MW+*/x=0.:·1&')];
const COLORS=['rgb(18,22,18)','rgb(50,53,50)','rgb(84,92,81)'];
export class AsciiGlyphAtlas {
  constructor(dpr=1) {
    this.dpr=Math.min(dpr,2);this.tile=32;this.columns=32;this.entries=new Map();
    this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=Math.ceil(1024*this.dpr);
    this.context=this.canvas.getContext('2d');this.context.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.context.textAlign='center';this.context.textBaseline='middle';
  }
  entry(char,size,band){
    const key=`${char}/${size}/${band}`;let entry=this.entries.get(key);
    if(entry)return entry;
    if(this.entries.size>=1024){this.entries.clear();this.context.clearRect(0,0,1024,1024);}
    const index=this.entries.size,cx=(index%this.columns)*this.tile,cy=Math.floor(index/this.columns)*this.tile;
    this.context.font=`${size}px "Courier New",monospace`;this.context.fillStyle=COLORS[band];
    const m=this.context.measureText(char);
    const left=Math.max(0,Math.floor(16-m.actualBoundingBoxLeft)-1),top=Math.max(0,Math.floor(16-m.actualBoundingBoxAscent)-1);
    const right=Math.min(32,Math.ceil(16+m.actualBoundingBoxRight)+1),bottom=Math.min(32,Math.ceil(16+m.actualBoundingBoxDescent)+1);
    this.context.fillText(char,cx+16,cy+16);
    entry={x:(cx+left)*this.dpr,y:(cy+top)*this.dpr,width:(right-left)*this.dpr,height:(bottom-top)*this.dpr,dx:left-16,dy:top-16,w:right-left,h:bottom-top};
    this.entries.set(key,entry);return entry;
  }
  warm(sizes){
    // A changed scroll scale may need a new size range. Rebuild before drawing,
    // rather than clearing an atlas midway through the particle pass.
    let missing=0;
    for(const size of sizes)for(let band=0;band<3;band++)for(const char of CHARACTERS)if(!this.entries.has(`${char}/${size}/${band}`))missing++;
    if(this.entries.size+missing>1024){this.entries.clear();this.context.clearRect(0,0,1024,1024);}
    for(const size of sizes)for(let band=0;band<3;band++)for(const char of CHARACTERS)this.entry(char,size,band);
  }
  draw(context,char,size,band,x,y,opacity) {
    const e=this.entry(char,size,band);
    context.globalAlpha=opacity;
    context.drawImage(this.canvas,e.x,e.y,e.width,e.height,x+e.dx,y+e.dy,e.w,e.h);
  }
  destroy(){this.entries.clear();this.canvas.width=this.canvas.height=1;}
}
