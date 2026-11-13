import test from 'node:test';
import assert from 'node:assert/strict';
import {processWheelTarget} from '../../src/lib/processProgress.js';
test('one gesture advances one topic, reverses one, and releases both boundaries',()=>{
 const targets=[1000,1480,1960,2440,2920,3400];
 assert.equal(processWheelTarget(1000,0,targets,1),1);
 assert.equal(processWheelTarget(1960,2,targets,-1),1);
 assert.equal(processWheelTarget(1000,0,targets,-1),null);
 assert.equal(processWheelTarget(3400,5,targets,1),null);
 assert.equal(processWheelTarget(960,0,targets,1),0);
 assert.equal(processWheelTarget(3440,5,targets,-1),5);
});

test('the card is the next stop after step six and releases normal scrolling afterwards',()=>{
 const targets=[1000,1480,1960,2440,2920,3400,4200];
 assert.equal(processWheelTarget(3400,5,targets,1),6);
 assert.equal(processWheelTarget(4200,6,targets,-1),5);
 assert.equal(processWheelTarget(4200,6,targets,1),null);
});
