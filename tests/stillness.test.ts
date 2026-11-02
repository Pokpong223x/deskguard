import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StillnessDetector } from '../src/domain/stillness';
import { MotionDetector } from '../src/domain/motion';
const rest = { x: 0, y: 0, z: 1 };
test('requires three continuous seconds and restarts after movement', () => {
  const s = new StillnessDetector();
  for(let t=0;t<3000;t+=50) assert.equal(s.sample(rest,null,t),false);
  assert.equal(s.sample(rest,null,3000),true);
  s.reset();
  assert.equal(s.sample(rest,null,3050),false);
  assert.equal(s.sample({x:0.2,y:0,z:1},null,3100),false);
});
test('missing, invalid and rotating samples cannot silence an alarm', () => {
  const s = new StillnessDetector();
  s.sample(rest,null,0);
  assert.equal(s.sample(rest,null,4000),false);
  assert.equal(s.sample({x:NaN,y:0,z:1},null,4050),false);
  for(let t=4100;t<9000;t+=50) assert.equal(s.sample(rest,{x:0.2,y:0,z:0},t),false);
});
test('resetting motion detector after quiet allows another pickup alarm', () => {
  const detector = new MotionDetector('medium');
  for (let cycle=0;cycle<2;cycle++) {
    detector.reset();
    for(let t=0;t<=1000;t+=50) detector.sample(rest,null,t);
    let fired=false;
    for(let t=1050;t<=1500;t+=50) fired ||= detector.sample({x:0.4,y:0,z:1},null,t).triggered;
    assert.equal(fired,true);
  }
});
