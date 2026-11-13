import test from 'node:test';
import assert from 'node:assert/strict';
import { blurIntensityFromProgress as intensity } from '../../src/lib/hero/blurProgress.js';
test('blur is absent through 85%, reaches full at 100%, and clamps beyond endpoints',()=>{
  for(const p of [-1,0,.8,.85])assert.equal(intensity(p),0);
  for(const p of [1,1.1,2])assert.equal(intensity(p),1);
  assert.ok(Math.abs(intensity(.9)-1/3)<.02);
  assert.ok(Math.abs(intensity(.95)-2/3)<.02);
});
test('continuous eased intensity increases monotonically and reverses without state',()=>{
  let previous=0;
  for(let i=0;i<=1000;i++){const p=i/1000,v=intensity(p);assert.ok(v>=previous);assert.ok(v-previous<.009);previous=v;}
  assert.notEqual(intensity(.901),intensity(.902));
});
