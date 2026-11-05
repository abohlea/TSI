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
      { uid: uidA, score: 4, kills: 2, deaths: 0, joinedAt: now - 59_000 },
      { uid: uidB, score: 1, kills: 0, deaths: 2, joinedAt: now - 58_000 }
    ]
  };

  try {
    assert.equal(await persistMatchResult(input), true);
    assert.equal(await persistMatchResult(input), false);
    const [match, playerA, playerB] = await Promise.all([matchRef.get(), statsA.get(), statsB.get()]);
    assert.deepEqual(match.get('participantUids'), [uidA, uidB]);
    assert.equal(match.get('winnerUid'), uidA);
    assert.equal(match.get('durationMs'), 60_000);
    assert.equal(playerA.get('matchesPlayed'), 1);
    assert.equal(playerA.get('kills'), 2);
    assert.equal(playerA.get('wins'), 1);
    assert.equal(playerB.get('deaths'), 2);
    assert.equal(playerB.get('wins'), 0);
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
