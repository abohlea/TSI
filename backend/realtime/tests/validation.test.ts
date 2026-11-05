import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlayerInput } from '../src/validation.js';

test('accepts a valid input and normalizes diagonal movement', () => {
  const result = parsePlayerInput({
    sequence: 1,
    moveX: 1,
    moveZ: 1,
    yaw: 370,
    sprint: true
  }, 0);

  assert.ok(result);
  assert.equal(result.sequence, 1);
  assert.ok(Math.abs(Math.hypot(result.moveX, result.moveZ) - 1) < 1e-9);
  assert.equal(result.yaw, 10);
  assert.equal(result.sprint, true);
});

test('rejects replayed or out-of-order input sequences', () => {
  assert.equal(parsePlayerInput({
    sequence: 4, moveX: 0, moveZ: 1, yaw: 0, sprint: false
  }, 4), null);
});

test('rejects implausibly large sequence jumps', () => {
  assert.equal(parsePlayerInput({
    sequence: 500, moveX: 0, moveZ: 1, yaw: 0, sprint: false
  }, 1), null);
});

test('rejects malformed values and non-finite numbers', () => {
  assert.equal(parsePlayerInput(null, 0), null);
  assert.equal(parsePlayerInput({
    sequence: 1, moveX: Number.NaN, moveZ: 0, yaw: 0, sprint: false
  }, 0), null);
  assert.equal(parsePlayerInput({
    sequence: 1, moveX: 0, moveZ: 0, yaw: 0, sprint: 'yes'
  }, 0), null);
});

test('clamps each movement axis before normalizing', () => {
  const result = parsePlayerInput({
    sequence: 1, moveX: 99, moveZ: 0, yaw: -90, sprint: false
  }, 0);

  assert.ok(result);
  assert.equal(result.moveX, 1);
  assert.equal(result.moveZ, 0);
  assert.equal(result.yaw, 270);
});
