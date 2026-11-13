// Keep scroll anchors centered on each content group.
export function processScrollRange(timelineTop,positions,scale,height) {
  const first=positions[0]??0,last=positions.at(-1)??first;
  return {start:timelineTop+first*scale-height/2,end:timelineTop+last*scale-height/2};
}
export function processState(value,positions) {
  const progress=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
  if(!positions.length)return {activeStep:0,progress};
  const point=positions[0]+(positions.at(-1)-positions[0])*progress;
  let activeStep=0;
  positions.forEach((position,index)=>{if(index&&point+1e-6>=(positions[index-1]+position)/2)activeStep=index;});
  return {activeStep,progress};
}


// Continuous digit offset between measured content centers, reversible with scroll.
export function processNumberPosition(value,positions) {
  const progress=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
  if(positions.length<2)return 0;
  const point=positions[0]+(positions.at(-1)-positions[0])*progress;
  for(let i=0;i<positions.length-1;i++){
    if(point<=positions[i+1]){
      const distance=positions[i+1]-positions[i];
      const t=distance>0?Math.max(0,Math.min(1,(point-positions[i])/distance)):1;
      return i+t*t*(3-2*t);
    }
  }
  return positions.length-1;
}

export function nearestProcessSnap(scroll,targets,threshold) {
  if(!targets.length)return null;
  const target=targets.reduce((best,next)=>Math.abs(next-scroll)<Math.abs(best-scroll)?next:best);
  const distance=Math.abs(target-scroll);
  return distance>4&&distance<=threshold?target:null;
}

// Cubic Hermite correction: preserve entry speed and finish at zero speed.
export function processSnapEase(t,slope=0) {
  return t*t*(3-2*t)+slope*t*(1-t)*(1-t);
}

export function processWheelTarget(scroll,index,targets,direction) {
  if(!targets.length||!direction)return null;
  if(direction>0&&scroll<targets[0]-4)return 0;
  if(direction<0&&scroll>targets.at(-1)+4)return targets.length-1;
  const next=index+direction;
  return next>=0&&next<targets.length?next:null;
}
