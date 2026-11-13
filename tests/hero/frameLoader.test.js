import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameLoader} from '../../src/lib/hero/frameLoader.js';
const settle=async loader=>{for(let i=0;i<1000&&(loader.active||loader.queue.length);i++)await new Promise(r=>setTimeout(r,1));};
test('warms a bounded runway of decoded frames before wheel input, including reverse',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;
 globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['frame'])});
 globalThis.createImageBitmap=async()=>({close(){}});
 const loader=new FrameLoader({base:'/frames',limit:16});
 try{
  loader.request(0);await settle(loader);
  for(let i=0;i<13;i++)assert.ok(loader.decoded.has(i),`initial runway ${i}`);
  assert.ok(loader.decoded.size<=16);
  loader.request(44);await settle(loader);
  loader.request(43);await settle(loader);
  for(let i=31;i<=43;i++)assert.ok(loader.decoded.has(i),`reverse runway ${i}`);
  assert.ok(loader.decoded.size<=16);
 }finally{loader.destroy();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});
