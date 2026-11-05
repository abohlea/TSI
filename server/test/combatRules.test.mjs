import test from "node:test";
import assert from "node:assert/strict";
import { resolvePracticeShot } from "../dist/combatRules.js";

function target(id, x, z, health = 100, active = true) {
  return { id, x, z, health, active };
}

test("hits the closest active target inside the firing corridor", () => {
  const near = target(1, 0, -8);
  const far = target(2, 0, -15);
  const result = resolvePracticeShot(0, 0, 0, [far, near]);

  assert.deepEqual(result, { targetId: 1, hit: true, eliminated: false });
  assert.equal(near.health, 66);
  assert.equal(far.health, 100);
});

test("misses targets outside the firing corridor or behind the player", () => {
  const side = target(1, 5, -8);
  const behind = target(2, 0, 8);
  const result = resolvePracticeShot(0, 0, 0, [side, behind]);

  assert.deepEqual(result, { targetId: null, hit: false, eliminated: false });
  assert.equal(side.health, 100);
  assert.equal(behind.health, 100);
});

test("three body hits eliminate a training target and deactivate it", () => {
  const dummy = target(7, 0, -10);

  const first = resolvePracticeShot(0, 0, 0, [dummy]);
  const second = resolvePracticeShot(0, 0, 0, [dummy]);
  const third = resolvePracticeShot(0, 0, 0, [dummy]);
  const fourth = resolvePracticeShot(0, 0, 0, [dummy]);

  assert.equal(first.hit, true);
  assert.equal(second.hit, true);
  assert.deepEqual(third, { targetId: 7, hit: true, eliminated: true });
  assert.equal(dummy.health, 0);
  assert.equal(dummy.active, false);
  assert.equal(fourth.hit, false);
});

test("rejects invalid combat parameters without mutating targets", () => {
  const dummy = target(1, 0, -10);
  const result = resolvePracticeShot(Number.NaN, 0, 0, [dummy]);

  assert.deepEqual(result, { targetId: null, hit: false, eliminated: false });
  assert.equal(dummy.health, 100);
});
