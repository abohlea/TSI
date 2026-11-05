import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPracticeTargets,
  resolveAuthoritativeShot,
  updatePlayerRespawns,
  type ServerCombatant
} from '../src/world.js';

function combatant(sessionId: string, x: number, z: number): ServerCombatant {
  return { sessionId, x, z, health: 100, respawnAt: 0 };
}

function shoot(players: ServerCombatant[], now: number, shooterSessionId = 'shooter') {
  return resolveAuthoritativeShot(
    0, 1.55, 4, 0, 0,
    createPracticeTargets(),
    now,
    shooterSessionId,
    players
  );
}

test('server hits the nearest opponent before a farther practice target', () => {
  const shooter = combatant('shooter', 0, 4);
  const near = combatant('near', 0, -8);
  const far = combatant('far', 0, -15);

  const result = shoot([shooter, near, far], 1000);

  assert.equal(result.hit, true);
  assert.equal(result.playerSessionId, 'near');
  assert.equal(result.targetId, null);
  assert.equal(near.health, 66);
  assert.equal(far.health, 100);
});

test('server excludes the shooter and does not accept a client-selected victim', () => {
  const shooter = combatant('shooter', 0, 4);
  const other = combatant('other', 20, 20);

  const result = shoot([shooter, other], 1000);

  assert.equal(result.playerSessionId, null);
  assert.equal(result.targetId, 'target-2');
  assert.equal(shooter.health, 100);
  assert.equal(other.health, 100);
});

test('three server-validated hits eliminate an opponent and respawn restores health', () => {
  const victim = combatant('victim', 0, -8);

  const first = shoot([victim], 1000);
  const second = shoot([victim], 1120);
  const third = shoot([victim], 1240);

  assert.equal(first.eliminated, false);
  assert.equal(second.eliminated, false);
  assert.equal(third.eliminated, true);
  assert.equal(victim.health, 0);
  assert.equal(victim.respawnAt, 1240 + 4000);

  assert.equal(updatePlayerRespawns([victim], 5239).length, 0);
  const respawned = updatePlayerRespawns([victim], 5240);
  assert.equal(respawned[0], victim);
  assert.equal(victim.health, 100);
  assert.equal(victim.respawnAt, 0);
});

test('server does not damage an opponent through a training-map building', () => {
  const shooter = combatant('shooter', -20, 4);
  const victim = combatant('victim', -20, -24);

  const result = resolveAuthoritativeShot(
    -20, 1.55, 4, 0, 0,
    createPracticeTargets(),
    1000,
    'shooter',
    [shooter, victim]
  );

  assert.equal(result.hit, false);
  assert.equal(victim.health, 100);
});

test('a dead opponent cannot be hit again before the server respawns them', () => {
  const victim = combatant('victim', 0, -8);
  victim.health = 0;
  victim.respawnAt = 5000;

  const result = shoot([victim], 2000);

  assert.equal(result.hit, true);
  assert.equal(result.playerSessionId, null);
  assert.equal(victim.health, 0);
});
