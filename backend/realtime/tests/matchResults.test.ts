import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '../src/firebaseAuth.js';
import { persistMatchResult } from '../src/matchResults.js';

test('match results are written once and update participant statistics atomically', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST
}, async () => {
  process.env.FIREBASE_PROJECT_ID ??= 'demo-tsi-rules';
  const matchId = 'match-test-' + randomUUID();
  const uidA = 'player-a-' + randomUUID();
  const uidB = 'player-b-' + randomUUID();
  const db = getFirestore(getFirebaseAdminApp());
  const matchRef = db.doc('matchSummaries/' + matchId);
  const statsA = db.doc('playerStats/' + uidA);
  const statsB = db.doc('playerStats/' + uidB);
  const now = Date.now();
  const input = {
    matchId,
    mode: 'field-test-ffa' as const,
    startedAt: now - 60_000,
    endedAt: now,
    participants: [
      { uid: uidA, score: 1, kills: 8, deaths: 0, joinedAt: now - 59_000 },
      { uid: uidB, score: 4, kills: 1, deaths: 2, joinedAt: now - 58_000 }
    ]
  };

  try {
    assert.equal(await persistMatchResult(input), true);
    assert.equal(await persistMatchResult(input), false);
    const [match, playerA, playerB] = await Promise.all([matchRef.get(), statsA.get(), statsB.get()]);
    assert.deepEqual(match.get('participantUids'), [uidA, uidB]);
    assert.equal(match.get('winnerUid'), uidB);
    assert.equal(match.get('durationMs'), 60_000);
    assert.equal(playerA.get('matchesPlayed'), 1);
    assert.equal(playerA.get('kills'), 8);
    assert.equal(playerA.get('wins'), 0);
    assert.equal(playerB.get('deaths'), 2);
    assert.equal(playerB.get('wins'), 1);
  } finally {
    await Promise.all([matchRef.delete(), statsA.delete(), statsB.delete()]);
  }
});

test('match result validation rejects duplicate identities and impossible timestamps', async () => {
  const base = {
    matchId: 'invalid-match',
    mode: 'field-test-ffa' as const,
    startedAt: 100,
    endedAt: 200,
    participants: [
      { uid: 'same', score: 0, kills: 0, deaths: 0, joinedAt: 100 },
      { uid: 'same', score: 0, kills: 0, deaths: 0, joinedAt: 100 }
    ]
  };
  await assert.rejects(() => persistMatchResult(base), /duplicate match participant/i);
  await assert.rejects(() => persistMatchResult({ ...base, matchId: 'bad-time', participants: [], endedAt: 50 }), /timestamps/i);
});


test('team match results persist the winning side and award wins to every teammate', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST
}, async () => {
  process.env.FIREBASE_PROJECT_ID ??= 'demo-tsi-rules';
  const matchId = 'team-match-test-' + randomUUID();
  const alphaUid = 'alpha-player-' + randomUUID();
  const bravoUid = 'bravo-player-' + randomUUID();
  const db = getFirestore(getFirebaseAdminApp());
  const matchRef = db.doc('matchSummaries/' + matchId);
  const alphaStats = db.doc('playerStats/' + alphaUid);
  const bravoStats = db.doc('playerStats/' + bravoUid);
  const now = Date.now();
  const input = {
    matchId,
    mode: 'field-test-teams' as const,
    winnerTeam: 'bravo' as const,
    teamWins: { alpha: 1, bravo: 2 },
    startedAt: now - 180_000,
    endedAt: now,
    participants: [
      { uid: alphaUid, team: 'alpha' as const, score: 2, kills: 2, deaths: 5, joinedAt: now - 179_000 },
      { uid: bravoUid, team: 'bravo' as const, score: 5, kills: 5, deaths: 2, joinedAt: now - 178_000 }
    ]
  };

  try {
    assert.equal(await persistMatchResult(input), true);
    assert.equal(await persistMatchResult(input), false);
    const [match, alpha, bravo] = await Promise.all([matchRef.get(), alphaStats.get(), bravoStats.get()]);
    assert.equal(match.get('winnerTeam'), 'bravo');
    assert.deepEqual(match.get('teamWins'), { alpha: 1, bravo: 2 });
    assert.equal(match.get('winnerUid'), null);
    assert.equal(alpha.get('wins'), 0);
    assert.equal(bravo.get('wins'), 1);
  } finally {
    await Promise.all([matchRef.delete(), alphaStats.delete(), bravoStats.delete()]);
  }
});

test('team match validation requires a valid team assignment before database access', async () => {
  const base = {
    matchId: 'team-validation',
    mode: 'field-test-teams' as const,
    startedAt: 100,
    endedAt: 200,
    participants: [
      { uid: 'team-player', score: 0, kills: 0, deaths: 0, joinedAt: 100 }
    ]
  };
  await assert.rejects(() => persistMatchResult(base), /missing a team/i);
  await assert.rejects(() => persistMatchResult({
    ...base,
    matchId: 'team-invalid',
    participants: [{ ...base.participants[0]!, team: 'gamma' as 'alpha' }]
  }), /invalid participant team/i);
});
