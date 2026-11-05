import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from './firebaseAuth.js';
import { persistMatchResult, type MatchParticipantResult } from './matchResults.js';

export interface MatchCheckpoint {
  matchId: string;
  mode: 'field-test-ffa' | 'field-test-teams';
  startedAt: number;
  participants: MatchParticipantResult[];
  winnerTeam?: 'alpha' | 'bravo' | null;
  teamWins?: { alpha: number; bravo: number };
}

function validateCheckpoint(value: MatchCheckpoint): void {
  if ((value.mode !== 'field-test-ffa' && value.mode !== 'field-test-teams') ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value.matchId) ||
      !Number.isSafeInteger(value.startedAt) || value.startedAt < 0 ||
      !Array.isArray(value.participants) || value.participants.length < 1 ||
      value.participants.length > (value.mode === 'field-test-teams' ? 10 : 8)) {
    throw new Error('Invalid match checkpoint.');
  }
  const ids = new Set<string>();
  for (const player of value.participants) {
    if (!player.uid || ids.has(player.uid) ||
        ![player.score, player.kills, player.deaths, player.joinedAt].every((n) => Number.isSafeInteger(n) && n >= 0) ||
        (value.mode === 'field-test-teams' && player.team !== 'alpha' && player.team !== 'bravo')) {
      throw new Error('Invalid match checkpoint participant.');
    }
    ids.add(player.uid);
  }
}

/** Durable server-side snapshot, written after joins and authoritative score changes. */
export async function saveMatchCheckpoint(value: MatchCheckpoint): Promise<void> {
  validateCheckpoint(value);
  const db = getFirestore(getFirebaseAdminApp());
  await db.doc('activeMatchCheckpoints/' + value.matchId).set({
    ...value,
    updatedAt: FieldValue.serverTimestamp()
  });
}

/** Finalizes matches left active by a process crash before the server accepts new rooms. */
export async function recoverAbandonedMatches(now = Date.now()): Promise<number> {
  const db = getFirestore(getFirebaseAdminApp());
  const snapshot = await db.collection('activeMatchCheckpoints').get();
  let recovered = 0;
  for (const document of snapshot.docs) {
    const value = document.data() as MatchCheckpoint;
    try {
      validateCheckpoint(value);
      await persistMatchResult({
        matchId: value.matchId,
        mode: value.mode,
        startedAt: value.startedAt,
        endedAt: Math.max(value.startedAt, now),
        participants: value.participants,
        winnerTeam: value.winnerTeam ?? null,
        teamWins: value.teamWins ?? { alpha: 0, bravo: 0 }
      });
      await document.ref.delete();
      recovered += 1;
    } catch (error) {
      console.error('[TSI] Could not recover abandoned match checkpoint:', document.id, error);
    }
  }
  return recovered;
}
