import { test } from 'node:test';
import assert from 'node:assert/strict';
const geometry = await import('../../src/lib/hero/geometry.js').catch(() => ({}));
test('scroll endpoints, clamping and all nine exact keyframes', () => {
  assert.equal(typeof geometry.frameFromProgress, 'function');
  for (let i=0;i<=8;i++) assert.equal(geometry.frameFromProgress(i/8),i*11);
  assert.equal(geometry.frameFromProgress(-1),0);
  assert.equal(geometry.frameFromProgress(2),88);
});
test('projective matrix hits all four corners, including perspective', () => {
  assert.equal(typeof geometry.homography, 'function');
  for (const q of [[[10,20],[600,70],[570,390],[20,420]],[[0,0],[1920,0],[1920,1080],[0,1080]]]) {
    const h=geometry.homography(1600,900,q);
    [[0,0],[1600,0],[1600,900],[0,900]].forEach(([x,y],i)=>{
      const p=geometry.project(h,x,y); assert.ok(Math.hypot(p[0]-q[i][0],p[1]-q[i][1])<1e-7);
    });
  }
});
test('desktop desk fills both sides and the screen stays centered below the header', () => {
  assert.equal(typeof geometry.layoutAtProgress, 'function');
  const screen={topLeft:[200,100],topRight:[900,140],bottomRight:[880,480],bottomLeft:[220,440]};
  for(const width of [1440,1920]){
    const l=geometry.layoutAtProgress({},.5,width,900,false,80,screen,[40,1060]);
    const quad=geometry.viewportCorners(screen,l);
    assert.ok(Math.abs(quad.reduce((sum,p)=>sum+p[1],0)/4-490)<1e-8);
    assert.ok(Math.abs(40*l.scale+l.x+4)<1e-8);
    assert.ok(Math.abs(1060*l.scale+l.x-width-4)<1e-8);
  }
});
test('mobile contains the full frame, preserves aspect and touches the section bottom',()=>{
  const l=geometry.layoutAtProgress({},.5,390,844,false,140);
  assert.ok(l.x>=0&&l.y>=140);
  assert.ok(Math.abs(l.y+832*l.scale-844)<1e-8);
  assert.ok(l.x+1104*l.scale<=390+1e-8);
});
test('table framing covers both viewport edges with uniform image scale',()=>{
  assert.equal(typeof geometry.coverDesk,'function');
  const fit=geometry.coverDesk({scale:1920/1104,x:0,y:-183.478},[43,1060],1920,1080,false);
  assert.ok(fit.scale>=1920/(1060-43));
  assert.ok(43*fit.scale+fit.x<=0);
  assert.ok(1060*fit.scale+fit.x>=1920);
});
