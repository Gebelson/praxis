import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoPlaybackGate} from '../../src/lib/hero/videoPlaybackGate.js';
function fakeVideo(play=()=>Promise.resolve()){
 return {autoplay:true,paused:true,currentTime:12,plays:0,addEventListener(){},removeEventListener(){},pause(){this.paused=true;},play(){this.plays++;this.paused=false;return play();}};
}
test('no play call in any intro phase; only completed releases playback',async()=>{
 const video=fakeVideo(),gate=new VideoPlaybackGate(video);
 for(const state of ['waiting','ascii-forming','ascii-resolving','revealing-monitor']){
  await gate.setState(state);await gate.play();assert.equal(video.plays,0);assert.equal(video.paused,true);assert.equal(video.currentTime,12);
 }
 await gate.setState('completed');assert.equal(video.plays,1);assert.equal(video.autoplay,false);
 await gate.setState('waiting');assert.equal(video.paused,true);
});
test('reduced motion stays paused; autoplay rejection is handled and can retry',async()=>{
 const video=fakeVideo(),gate=new VideoPlaybackGate(video,{reduced:true});
 await gate.setState('completed');assert.equal(video.plays,0);
 await gate.setReduced(false);assert.equal(video.plays,1);
 let blocked=false;const denied=fakeVideo(()=>Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'})));
 const other=new VideoPlaybackGate(denied,{onBlocked:value=>blocked=value});await other.setState('completed');assert.equal(blocked,true);assert.equal(other.allowed,true);
});
test('late play resolution cannot resume a canceled intro',async()=>{
 let resolve;const video=fakeVideo(()=>new Promise(r=>resolve=r)),gate=new VideoPlaybackGate(video);
 const pending=gate.setState('completed');gate.setState('ascii-forming');resolve();await pending;assert.equal(video.paused,true);assert.equal(gate.allowed,false);
});
