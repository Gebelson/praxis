// Motion and palette follow the approved PRAXIS magnetic ASCII demonstration.
export const INTRO_DURATION=3200;
export const clamp=value=>Math.max(0,Math.min(1,value));
export function smooth(a,b,value){const t=clamp((value-a)/(b-a));return t*t*(3-2*t);}
export function random(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function quadratic(a,b,c,t){const k=1-t;return k*k*a+2*k*t*b+t*t*c;}
export function phaseAt(p){return p<.55?'ascii-forming':p<.71?'ascii-resolving':p<1?'revealing-monitor':'completed';}

export function sampleMonitor(image,corners,cell,maxPoints=6000) {
  const canvas=document.createElement('canvas');canvas.width=552;canvas.height=416;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,552,416);
  // A temporary sampled dark aperture. The actual frame asset is never changed.
  context.beginPath();
  ['topLeft','topRight','bottomRight','bottomLeft'].forEach((name,i)=>{
    const [x,y]=corners[name];if(i)context.lineTo(x/2,y/2);else context.moveTo(x/2,y/2);
  });
  context.closePath();context.fillStyle='#101110';context.fill();
  const {data}=context.getImageData(0,0,552,416),rnd=random(13462),points=[];
  // Sample the complete original silhouette, including the desk and visible cables.
  for(let y=3;y<829;y+=cell)for(let x=3;x<1101;x+=cell){
    const index=(Math.min(415,Math.round(y/2))*552+Math.min(551,Math.round(x/2)))*4;
    if(data[index+3]<184)continue;
    const dark=1-(data[index]*.2126+data[index+1]*.7152+data[index+2]*.0722)/255;
    if(dark<.07&&rnd()<.4)continue;
    const chars=dark>.77?'@#%X8MW':dark>.32?'+*/x=0':'.:·+10';
    points.push({x,y,dark,side:rnd()<.5?-1:1,origin:rnd(),vertical:rnd()-.5,curve:rnd(),bend:rnd()-.5,
      start:.03+rnd()*.33,duration:.30+rnd()*.29,char:chars[Math.floor(rnd()*chars.length)],
      alpha:dark>.75?.88:dark>.3?.6:.21+rnd()*.18,phase:rnd()*6.28,font:.9+rnd()*.25});
  }
  // Deterministic thinning bounds work without concentrating points in one area.
  if(points.length<=maxPoints)return points;
  const step=points.length/maxPoints;return Array.from({length:maxPoints},(_,i)=>points[Math.floor(i*step)]);
}
