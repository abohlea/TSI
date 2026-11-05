import test from "node:test";
import assert from "node:assert/strict";
import { movePlayer, parsePlayerInput } from "../dist/gameRules.js";

test("parsePlayerInput accepts monotonic sequence and normalizes direction", () => {
  const input = parsePlayerInput({
    sequence: 4,
    moveX: 0.8,
    moveZ: 0.8,
    yaw: 370
  }, 3);

  assert.ok(input);
  assert.equal(input.sequence, 4);
  assert.equal(input.yaw, 10);
  assert.ok(Math.abs(Math.hypot(input.moveX, input.moveZ) - 1) < 1e-9);
});

test("parsePlayerInput rejects stale, malformed and out-of-range input", () => {
  assert.equal(parsePlayerInput({ sequence: 2, moveX: 0, moveZ: 0, yaw: 0 }, 2), null);
  assert.equal(parsePlayerInput({ sequence: 3, moveX: 2, moveZ: 0, yaw: 0 }, 2), null);
  assert.equal(parsePlayerInput({ sequence: 3, moveX: 0, moveZ: 0, yaw: 4000 }, 2), null);
  assert.equal(parsePlayerInput({ sequence: 3, moveX: Number.NaN, moveZ: 0, yaw: 0 }, 2), null);
  assert.equal(parsePlayerInput(null, 2), null);
});

test("movePlayer applies server speed and keeps the world bounds", () => {
  const input = { sequence: 1, moveX: 0, moveZ: 1, yaw: 0 };
  const next = movePlayer(0, 0, input, 0.05);
  assert.ok(next.z < 0);
  assert.equal(next.x, 0);

  const edge = movePlayer(47.9, 0, {
    sequence: 2,
    moveX: 1,
    moveZ: 0,
    yaw: 90
  }, 0.1);
  assert.ok(edge.x <= 48);
});

test("movePlayer stops the operator at a training wall", () => {
  const input = { sequence: 1, moveX: 0, moveZ: 1, yaw: 0 };
  const next = movePlayer(-8, -13.5, input, 0.1);
  assert.equal(next.x, -8);
  assert.equal(next.z, -13.5);
});

test("movePlayer caps a long frame to avoid a large teleport", () => {
  const input = { sequence: 1, moveX: 0, moveZ: 1, yaw: 0 };
  const next = movePlayer(0, 0, input, 1);
  assert.ok(Math.abs(next.z) <= 0.72 + 1e-9);
});
