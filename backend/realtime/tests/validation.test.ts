import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlayerInput } from '../src/validation.js';

const validInput = {
  sequence: 1,
  moveX: 1,
  moveZ: 1,
  yaw: 370,
  pitch: -4,
  sprint: true,
  shoot: false
};

test('accepts a valid input and normalizes diagonal movement', () => {
  const result = parsePlayerInput(validInput, 0);
  assert.ok(result);
  assert.equal(result.sequence, 1);
  assert.ok(Math.abs(Math.hypot(result.moveX, result.moveZ) - 1) < 1e-9);
  assert.equal(result.yaw, 10);
  assert.equal(result.pitch, -4);
  assert.equal(result.sprint, true);
  assert.equal(result.shoot, false);
});

test('rejects replayed or out-of-order input sequences', () => {
  assert.equal(parsePlayerInput({ ...validInput, sequence: 4 }, 4), null);
});

test('rejects implausibly large sequence jumps', () => {
  assert.equal(parsePlayerInput({ ...validInput, sequence: 500 }, 1), null);
});

test('rejects malformed values and non-finite numbers', () => {
  assert.equal(parsePlayerInput(null, 0), null);
  assert.equal(parsePlayerInput({ ...validInput, moveX: Number.NaN }, 0), null);
  assert.equal(parsePlayerInput({ ...validInput, shoot: 'yes' }, 0), null);
});

test('clamps each movement axis before normalizing', () => {
  const result = parsePlayerInput({ ...validInput, moveX: 99, moveZ: 0, yaw: -90 }, 0);
  assert.ok(result);
  assert.equal(result.moveX, 1);
  assert.equal(result.moveZ, 0);
  assert.equal(result.yaw, 270);
});

test('rejects non-finite and implausible camera pitch', () => {
  assert.equal(parsePlayerInput({ ...validInput, pitch: Number.NaN }, 0), null);
  assert.equal(parsePlayerInput({ ...validInput, pitch: 70 }, 0), null);
});

test('accepts a validated held-fire input', () => {
  const result = parsePlayerInput({ ...validInput, shoot: true }, 0);
  assert.ok(result);
  assert.equal(result.shoot, true);
});
