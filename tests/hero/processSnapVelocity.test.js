import test from 'node:test';
import assert from 'node:assert/strict';
import {processSnapEase} from '../../src/lib/processProgress.js';
test('settling keeps the entry velocity, stays monotonic and stops smoothly',()=>{
 for(const slope of [0,.5,1,2,2.5]){
  assert.equal(processSnapEase(0,slope),0);assert.equal(processSnapEase(1,slope),1);
  const epsilon=.00001;
  assert.ok(Math.abs(processSnapEase(epsilon,slope)/epsilon-slope)<.001);
  assert.ok(Math.abs((1-processSnapEase(1-epsilon,slope))/epsilon)<.001);
  let previous=0;
  for(let i=1;i<=100;i++){const y=processSnapEase(i/100,slope);assert.ok(y>=previous&&y<=1);previous=y;}
 }
});
