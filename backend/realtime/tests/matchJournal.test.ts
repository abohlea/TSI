import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '../src/firebaseAuth.js';
import { recoverAbandonedMatches, saveMatchCheckpoint } from '../src/matchJournal.js';

test('crash recovery finalizes a checkpoint exactly once', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST
}, async () => {
  process.env.FIREBASE_PROJECT_ID ??= 'demo-tsi-rules';
  const db = getFirestore(getFirebaseAdminApp());
  const matchId = 'recovery-' + randomUUID();
  const uid = 'recovery-player-' + randomUUID();
  const checkpointRef = db.doc('activeMatchCheckpoints/' + matchId);
  const summaryRef = db.doc('matchSummaries/' + matchId);
  const statsRef = db.doc('playerStats/' + uid);
  const startedAt = Date.now() - 10_000;
  try {
    await saveMatchCheckpoint({
      matchId, mode: 'field-test-ffa', startedAt,
      participants: [{ uid, score: 3, kills: 3, deaths: 1, joinedAt: startedAt }]
    });
    assert.equal(await recoverAbandonedMatches(Date.now()), 1);
    assert.equal((await summaryRef.get()).get('mode'), 'field-test-ffa');
    assert.equal((await statsRef.get()).get('matchesPlayed'), 1);
    assert.equal((await checkpointRef.get()).exists, false);
    assert.equal(await recoverAbandonedMatches(Date.now()), 0);
    assert.equal((await statsRef.get()).get('matchesPlayed'), 1);
  } finally {
    await Promise.all([checkpointRef.delete(), summaryRef.delete(), statsRef.delete()]);
  }
});
