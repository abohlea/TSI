import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAYER_DAMAGE,
  PLAYER_RESPAWN_SECONDS,
  resolveAuthoritativeHit,
  type CombatPlayer,
  type CombatTarget
} from "../src/combat.js";

function player(sessionId: string, x: number, z: number): CombatPlayer {
  return { sessionId, x, z, health: 100 };
}

function target(id: number, x: number, z: number): CombatTarget {
  return { id, x, z, health: 100, active: true };
}

const noBlockers = [] as const;

test("nearest opponent is hit before a farther practice target", () => {
  const victim = player("victim", 0, -8);
  const farTarget = target(1, 0, -20);

  const result = resolveAuthoritativeHit(0, 4, 0, "shooter", [farTarget], [victim], noBlockers);

  assert.deepEqual(result, { kind: "player", sessionId: "victim", eliminated: false });
  assert.equal(victim.health, 100 - PLAYER_DAMAGE);
  assert.equal(farTarget.health, 100);
});

test("the shooter is excluded and the server selects the victim", () => {
  const shooter = player("shooter", 0, -4);
  const victim = player("victim", 20, -12);
  const practiceTarget = target(2, 0, -18);

  const result = resolveAuthoritativeHit(
    0, 4, 0, "shooter", [practiceTarget], [shooter, victim], noBlockers
  );

  assert.deepEqual(result, { kind: "target", targetId: 2, eliminated: false });
  assert.equal(shooter.health, 100);
  assert.equal(victim.health, 100);
  assert.equal(practiceTarget.health, 100 - PLAYER_DAMAGE);
});

test("three server-resolved hits eliminate a player and expose the respawn delay", () => {
  const victim = player("victim", 0, -8);
  const targets: CombatTarget[] = [];

  const first = resolveAuthoritativeHit(0, 4, 0, "shooter", targets, [victim], noBlockers);
  const second = resolveAuthoritativeHit(0, 4, 0, "shooter", targets, [victim], noBlockers);
  const third = resolveAuthoritativeHit(0, 4, 0, "shooter", targets, [victim], noBlockers);

  assert.equal(first.kind, "player");
  assert.equal(first.kind === "player" && first.eliminated, false);
  assert.equal(second.kind, "player");
  assert.equal(second.kind === "player" && second.eliminated, false);
  assert.deepEqual(third, { kind: "player", sessionId: "victim", eliminated: true });
  assert.equal(victim.health, 0);
  assert.equal(PLAYER_RESPAWN_SECONDS, 4);
});

test("an obstacle blocks a shot before it reaches the opponent", () => {
  const victim = player("victim", 0, -12);
  const blocker = { minX: -2, maxX: 2, minZ: -6, maxZ: -4 };

  const result = resolveAuthoritativeHit(0, 4, 0, "shooter", [], [victim], [blocker]);

  assert.deepEqual(result, { kind: "miss" });
  assert.equal(victim.health, 100);
});

test("eliminated players cannot be hit again before respawning", () => {
  const victim = player("victim", 0, -8);
  victim.health = 0;

  const result = resolveAuthoritativeHit(0, 4, 0, "shooter", [], [victim], noBlockers);

  assert.deepEqual(result, { kind: "miss" });
  assert.equal(victim.health, 0);
});
