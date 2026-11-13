import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestProcessSnap} from '../../src/lib/processProgress.js';
test('magnet only selects a nearby center and avoids repeated subpixel corrections',()=>{
 const targets=[1000,1480,1960,2440];
 assert.equal(nearestProcessSnap(1410,targets,108),1480);
 assert.equal(nearestProcessSnap(1540,targets,108),1480);
 assert.equal(nearestProcessSnap(1240,targets,108),null);
 assert.equal(nearestProcessSnap(1479.5,targets,108),null);
 assert.equal(nearestProcessSnap(1477,targets,108),null);
 assert.equal(nearestProcessSnap(500,[],108),null);
});
