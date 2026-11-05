import assert from 'node:assert/strict';
import test from 'node:test';
import { canOccupyPosition, createPracticeTargets, findSpawnPosition, resolveAuthoritativeCombatShot, resolveAuthoritativePlayerShot, resolveAuthoritativeShot, updateTargetRespawns } from '../src/world.js';

test('practice world blocks players inside structures and outside world bounds', () => {
  assert.equal(canOccupyPosition(0, 4), true);
  assert.equal(canOccupyPosition(-20, -12), false);
  assert.equal(canOccupyPosition(70, 0), false);
});

test('server ray resolves a hit on the closest practice target', () => {
  const targets = createPracticeTargets();
  const result = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1000);

  assert.equal(result.hit, true);
  assert.equal(result.eliminated, false);
  assert.equal(result.targetId, 'target-2');
  assert.equal(targets[1]?.health, 66);
});

test('server target health and elimination are independent of client claims', () => {
  const targets = createPracticeTargets();
  const first = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1000);
  const second = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1200);
  const third = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1400);

  assert.equal(first.hit, true);
  assert.equal(second.hit, true);
  assert.equal(third.eliminated, true);
  assert.equal(targets[1]?.health, 0);
  assert.equal(targets[1]?.active, false);
});

test('targets respawn only after their server-controlled respawn time', () => {
  const targets = createPracticeTargets();
  const target = targets[1];
  assert.ok(target);

  resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1000);
  resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1200);
  resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, targets, 1400);

  updateTargetRespawns(targets, 5899);
  assert.equal(target.active, false);

  updateTargetRespawns(targets, 5900);
  assert.equal(target.active, true);
  assert.equal(target.health, 100);
});

test('server ray does not hit a target when an obstacle blocks the line', () => {
  const targets = createPracticeTargets();
  const obstructedTarget = targets[0];
  assert.ok(obstructedTarget);
  obstructedTarget.x = -20;
  obstructedTarget.z = -24;

  const result = resolveAuthoritativeShot(-20, 1.55, 4, 0, -2.4, [obstructedTarget], 2000);
  assert.equal(result.hit, false);
  assert.equal(obstructedTarget.health, 100);
});

test('server ray damages the nearest enemy player and ignores the shooter', () => {
  const players = [
    { playerId: 'shooter', x: 0, z: 4, health: 100 },
    { playerId: 'enemy-near', x: 0, z: -10, health: 100 },
    { playerId: 'enemy-far', x: 0, z: -20, health: 100 }
  ];

  const result = resolveAuthoritativePlayerShot(
    'shooter', 0, 1.55, 4, 0, 0, players
  );

  assert.equal(result.hit, true);
  assert.equal(result.eliminated, false);
  assert.equal(result.targetPlayerId, 'enemy-near');
  assert.equal(players[0]?.health, 100);
  assert.equal(players[1]?.health, 66);
  assert.equal(players[2]?.health, 100);
});

test('server ray cannot damage an enemy behind a world obstacle', () => {
  const players = [
    { playerId: 'shooter', x: -20, z: 4, health: 100 },
    { playerId: 'enemy', x: -20, z: -24, health: 100 }
  ];

  const result = resolveAuthoritativePlayerShot(
    'shooter', -20, 1.55, 4, 0, 0, players
  );

  assert.equal(result.hit, false);
  assert.equal(result.targetPlayerId, null);
  assert.equal(players[1]?.health, 100);
});

test('server ray ignores inactive practice targets and targets beyond weapon range', () => {
  const inactive = createPracticeTargets()[1];
  assert.ok(inactive);
  inactive.active = false;
  const inactiveResult = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, [inactive], 3000);
  assert.equal(inactiveResult.hit, false);
  assert.equal(inactive.health, 100);

  inactive.active = true;
  inactive.z = -100;
  const distantResult = resolveAuthoritativeShot(0, 1.55, 4, 0, -2.4, [inactive], 3000);
  assert.equal(distantResult.hit, false);
  assert.equal(inactive.health, 100);
});

test('server ray skips eliminated players and damages the next living target', () => {
  const players = [
    { playerId: 'shooter', x: 0, z: 4, health: 100 },
    { playerId: 'already-eliminated', x: 0, z: -8, health: 0 },
    { playerId: 'living-enemy', x: 0, z: -18, health: 100 }
  ];

  const result = resolveAuthoritativePlayerShot('shooter', 0, 1.55, 4, 0, 0, players);
  assert.equal(result.hit, true);
  assert.equal(result.targetPlayerId, 'living-enemy');
  assert.equal(players[1]?.health, 0);
  assert.equal(players[2]?.health, 66);
});

test('server player shot eliminates an enemy at zero health', () => {
  const players = [
    { playerId: 'shooter', x: 0, z: 4, health: 100 },
    { playerId: 'enemy', x: 0, z: -10, health: 34 }
  ];

  const result = resolveAuthoritativePlayerShot(
    'shooter', 0, 1.55, 4, 0, 0, players
  );

  assert.equal(result.hit, true);
  assert.equal(result.eliminated, true);
  assert.equal(players[1]?.health, 0);
});


test('spawn allocator chooses an unoccupied position after a player leaves', () => {
  const remaining = [{ x: -2, z: 5 }, { x: -2, z: 9 }, { x: 2, z: 9 }];
  const spawn = findSpawnPosition(remaining);
  assert.ok(spawn);
  assert.ok(remaining.every((player) => Math.hypot(player.x - spawn.x, player.z - spawn.z) >= 1.36));
});

test('spawn allocator fills ten distinct positions and refuses an eleventh', () => {
  const players: Array<{ x: number; z: number }> = [];
  for (let index = 0; index < 10; index += 1) {
    const spawn = findSpawnPosition(players);
    assert.ok(spawn, `spawn ${index + 1} should be available`);
    players.push(spawn);
  }
  assert.equal(findSpawnPosition(players), null);
});


test('one authoritative ray hits the nearer player before a practice target', () => {
  const targets = createPracticeTargets();
  const players = [
    { playerId: 'shooter', x: 0, z: 4, health: 100 },
    { playerId: 'enemy', x: 0, z: -10, health: 100 }
  ];
  const result = resolveAuthoritativeCombatShot('shooter', 0, 1.55, 4, 0, 0, players, targets, 2000);
  assert.deepEqual(result, {
    hit: true, eliminated: false, targetKind: 'player', targetId: 'enemy'
  });
  assert.equal(players[1]?.health, 66);
  assert.equal(targets[1]?.health, 100);
});

test('one authoritative ray hits the nearer practice target before a player', () => {
  const targets = createPracticeTargets();
  const players = [
    { playerId: 'shooter', x: 0, z: 4, health: 100 },
    { playerId: 'enemy', x: 0, z: -40, health: 100 }
  ];
  const result = resolveAuthoritativeCombatShot('shooter', 0, 1.55, 4, 0, 0, players, targets, 2000);
  assert.deepEqual(result, {
    hit: true, eliminated: false, targetKind: 'practice', targetId: 'target-2'
  });
  assert.equal(players[1]?.health, 100);
  assert.equal(targets[1]?.health, 66);
});
