import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../src/translations';
test('language selection preserves Thai and translates guard actions', () => {
  assert.equal(translate('เริ่มเฝ้าระวัง', 'th'), 'เริ่มเฝ้าระวัง');
  assert.equal(translate('เริ่มเฝ้าระวัง', 'en'), 'Start monitoring');
  assert.equal(translate('กำลังเฝ้าระวัง', 'en'), 'Monitoring');
});
test('dynamic translations preserve counts and sensitivity', () => {
  assert.equal(translate('เริ่มใน 5 วินาที', 'en'), 'Starting in 5 seconds');
  assert.equal(translate('ดูเพิ่ม (12)', 'en'), 'Show more (12)');
  assert.equal(translate('ความไวสูง', 'en'), 'Sensitivity: High');
  assert.equal(translate('ใช้ Face ID หรือรหัสเครื่อง', 'en'), 'Use Face ID or device passcode');
});
test('unknown user content is preserved and JSX whitespace is normalized', () => {
  assert.equal(translate('my-alarm.mp3', 'en'), 'my-alarm.mp3');
  assert.equal(translate('  กำลังเฝ้าระวัง  ', 'en'), 'Monitoring');
});
