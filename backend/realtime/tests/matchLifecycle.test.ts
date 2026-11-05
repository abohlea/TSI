import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceMatchLifecycle, createMatchLifecycle, finishMatchLifecycle, getMatchRemainingMs } from '../src/matchLifecycle.js';

test('match waits for countdown before becoming active', () => {
  const initial = createMatchLifecycle(1_000, { countdownMs: 5_000, durationMs: 60_000, scoreLimit: 3 });
  assert.equal(initial.phase, 'countdown');
  assert.equal(getMatchRemainingMs(initial, 2_000), 4_000);
  assert.equal(advanceMatchLifecycle(initial, 5_999).phase, 'countdown');
  assert.equal(advanceMatchLifecycle(initial, 6_000).phase, 'active');
});

test('active match ends at its deadline and cannot restart', () => {
  const initial = createMatchLifecycle(1_000, { countdownMs: 0, durationMs: 10_000, scoreLimit: 3 });
  const active = advanceMatchLifecycle(initial, 1_000);
  const finished = advanceMatchLifecycle(active, 11_000);
  assert.equal(finished.phase, 'finished');
  assert.equal(finished.finishReason, 'time-limit');
  assert.equal(advanceMatchLifecycle(finished, 20_000), finished);
});

test('score-limit finish is bounded by match start and end', () => {
  const initial = createMatchLifecycle(1_000, { countdownMs: 5_000, durationMs: 60_000, scoreLimit: 3 });
  const active = advanceMatchLifecycle(initial, 6_000);
  const finished = finishMatchLifecycle(active, 7_000, 'player-a');
  assert.equal(finished.phase, 'finished');
  assert.equal(finished.winnerUid, 'player-a');
  assert.equal(finishMatchLifecycle(finished, 8_000, 'player-b'), finished);
});

test('invalid lifecycle configuration is rejected', () => {
  assert.throws(() => createMatchLifecycle(-1));
  assert.throws(() => createMatchLifecycle(0, { countdownMs: -1, durationMs: 1000, scoreLimit: 1 }));
});
