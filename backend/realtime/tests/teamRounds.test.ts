import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTeamMatch,
  assignBalancedTeam,
  createTeamMatch,
  recordTeamElimination
} from '../src/teamRounds.js';

test('assigns each new player to the smaller team and balances both sides', () => {
  assert.equal(assignBalancedTeam(0, 0), 'alpha');
  assert.equal(assignBalancedTeam(1, 0), 'bravo');
  assert.equal(assignBalancedTeam(1, 1), 'alpha');
  assert.equal(assignBalancedTeam(3, 0), 'bravo');
  assert.throws(() => assignBalancedTeam(-1, 0));
});

test('best-of-three ends when a team wins two rounds', () => {
  let state = createTeamMatch(1_000);
  for (let i = 0; i < 5; i++) state = recordTeamElimination(state, 'alpha', 2_000 + i);
  assert.equal(state.phase, 'intermission');
  assert.deepEqual(state.roundWins, { alpha: 1, bravo: 0 });
  state = advanceTeamMatch(state, state.intermissionEndsAt!);
  for (let i = 0; i < 5; i++) state = recordTeamElimination(state, 'alpha', state.roundStartedAt + i + 1);
  assert.equal(state.phase, 'finished');
  assert.equal(state.winner, 'alpha');
  assert.deepEqual(state.roundWins, { alpha: 2, bravo: 0 });
});

test('round timeout awards the higher score and tied round does not award a win', () => {
  let state = createTeamMatch(0);
  state = recordTeamElimination(state, 'bravo', 1);
  state = advanceTeamMatch(state, state.roundEndsAt);
  assert.deepEqual(state.roundWins, { alpha: 0, bravo: 1 });
  assert.equal(state.phase, 'intermission');

  state = advanceTeamMatch(state, state.intermissionEndsAt!);
  state = advanceTeamMatch(state, state.roundEndsAt);
  assert.deepEqual(state.roundWins, { alpha: 0, bravo: 1 });
});

test('finished matches and late eliminations are immutable', () => {
  let state = createTeamMatch(0);
  for (let i = 0; i < 5; i++) state = recordTeamElimination(state, 'bravo', i + 1);
  state = advanceTeamMatch(state, state.intermissionEndsAt!);
  for (let i = 0; i < 5; i++) state = recordTeamElimination(state, 'bravo', state.roundStartedAt + i + 1);
  assert.equal(advanceTeamMatch(state, Number.MAX_SAFE_INTEGER), state);
  assert.equal(recordTeamElimination(state, 'alpha', Number.MAX_SAFE_INTEGER), state);
});

test('a tied third round ends the best-of-three as a draw', () => {
  let state = createTeamMatch(0);
  state = recordTeamElimination(state, 'alpha', 1);
  state = advanceTeamMatch(state, state.roundEndsAt);
  state = advanceTeamMatch(state, state.intermissionEndsAt!);
  state = recordTeamElimination(state, 'bravo', state.roundStartedAt + 1);
  state = advanceTeamMatch(state, state.roundEndsAt);
  state = advanceTeamMatch(state, state.intermissionEndsAt!);
  state = advanceTeamMatch(state, state.roundEndsAt);
  assert.equal(state.phase, 'finished');
  assert.equal(state.round, 3);
  assert.equal(state.winner, null);
});
