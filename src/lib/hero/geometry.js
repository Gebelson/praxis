export const FRAME_COUNT = 89;
export const clamp = p => Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
export const frameFromProgress = p => Math.round(clamp(p) * 88);
export const cornerNames = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

// Solve the eight projective coefficients with partial-pivot Gaussian elimination.
export function homography(width, height, quad) {
  const source = [[0,0],[width,0],[width,height],[0,height]];
  const a = [];
  source.forEach(([x,y], i) => {
    const [u,v] = quad[i];
    a.push([x,y,1,0,0,0,-u*x,-u*y,u]);
    a.push([0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  for (let c=0;c<8;c++) {
    let pivot=c;
    for(let r=c+1;r<8;r++) if(Math.abs(a[r][c])>Math.abs(a[pivot][c])) pivot=r;
    [a[c],a[pivot]]=[a[pivot],a[c]];
    const divisor=a[c][c];
    if(Math.abs(divisor)<1e-12) throw new Error('Degenerate screen quadrilateral');
    for(let j=c;j<9;j++) a[c][j]/=divisor;
    for(let r=0;r<8;r++) if(r!==c) {
      const factor=a[r][c];for(let j=c;j<9;j++) a[r][j]-=factor*a[c][j];
    }
  }
  return [...a.map(row=>row[8]),1];
}
export function project(h,x,y) {
  const w=h[6]*x+h[7]*y+1;
  return [(h[0]*x+h[1]*y+h[2])/w,(h[3]*x+h[4]*y+h[5])/w];
}
export function cssMatrix(h) {
  return `matrix3d(${[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].join(',')})`;
}
export function layoutAtProgress(motion, progress, width, height, staticMode=false,topInset=0,screen=null,desk=null) {
  if(width<=1024){
    const scale=Math.min(width/1104,Math.max(1,height-topInset)/832);
    return {scale,x:(width-1104*scale)/2,y:height-832*scale};
  }
  // Fill the screen side to side; place the actual monitor at the visual center
  // below the header. The desk continues below the viewport without stretching.
  const [left,right]=desk??[0,1104];
  // Overscan the antialiased desk edges so no subpixel seam reaches the sides.
  const scale=(width+8)/(right-left);
  const centerY=screen?cornerNames.reduce((sum,key)=>sum+screen[key][1],0)/4:416;
  return {scale,x:width/2-(left+right)/2*scale,y:(height+topInset)/2-centerY*scale};
}
export function viewportCorners(corners,layout) {
  return cornerNames.map(k=>[corners[k][0]*layout.scale+layout.x,corners[k][1]*layout.scale+layout.y]);
}
export function expandQuad(q,padding) {
  const lines=q.map((a,i)=>{
    const b=q[(i+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const nx=dy/length,ny=-dx/length;
    return [nx,ny,nx*a[0]+ny*a[1]+padding];
  });
  return lines.map((b,i)=>{
    const a=lines[(i+3)%4],d=a[0]*b[1]-b[0]*a[1];
    return [(a[2]*b[1]-b[2]*a[1])/d,(a[0]*b[2]-b[0]*a[2])/d];
  });
}
export function coverDesk(layout,bounds,width,height,staticMode) {
  const [left,right]=bounds;
  const scale=Math.max(layout.scale,(width+2)/(right-left));
  return {scale,x:width/2-(left+right)/2*scale,
    y:staticMode?height-832*scale:layout.y+416*(layout.scale-scale)};
}
