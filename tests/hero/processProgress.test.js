import test from 'node:test';
import assert from 'node:assert/strict';
import {processState,processScrollRange,processNumberPosition} from '../../src/lib/processProgress.js';
test('first and last content markers hit viewport center at the range endpoints',()=>{
 const positions=[120,600,1090,1570,2050,2540];
 for(const scale of [1,1.333,.8]){
  const {start,end}=processScrollRange(1000,positions,scale,900);
  assert.equal(1000+positions[0]*scale-start,450);
  assert.equal(1000+positions.at(-1)*scale-end,450);
 }
});
test('number changes at the midpoint between uneven content centers in both directions',()=>{
 const dots=[80,500,985,1460,1940,2420];
 for(let i=0;i<dots.length;i++){
  const p=(dots[i]-dots[0])/(dots.at(-1)-dots[0]);
  assert.equal(processState(p,dots).activeStep,i);
  if(i){
   const midpoint=((dots[i-1]+dots[i])/2-dots[0])/(dots.at(-1)-dots[0]);
   assert.equal(processState(midpoint-0.0001,dots).activeStep,i-1);
   assert.equal(processState(midpoint,dots).activeStep,i);
   assert.equal(processState(midpoint+0.0001,dots).activeStep,i);
  }
 }
 assert.deepEqual(processState(-1,dots),{activeStep:0,progress:0});
 assert.deepEqual(processState(2,dots),{activeStep:5,progress:1});
 assert.equal(processState(.5,[]).activeStep,0);
});

test('digit travels continuously between measured centers and reverses without delay',()=>{
 const positions=[80,500,985,1460,1940,2420];
 const at=point=>processNumberPosition((point-80)/2340,positions);
 for(let i=0;i<positions.length-1;i++){
  const a=positions[i],gap=positions[i+1]-a;
  assert.equal(at(a),i);
  assert.ok(Math.abs(at(a+gap/2)-(i+.5))<1e-9);
  assert.ok(at(a+gap*.25)>i&&at(a+gap*.25)<i+.5);
  assert.ok(Math.abs(at(a+gap*.50001)-at(a+gap*.49999))<.001);
 }
 assert.equal(processNumberPosition(-1,positions),0);
 assert.equal(processNumberPosition(2,positions),5);
 assert.equal(processNumberPosition(.5,[]),0);
});
