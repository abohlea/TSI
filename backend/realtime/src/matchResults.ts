import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from './firebaseAuth.js';

export interface MatchParticipantResult {
  uid: string;
  score: number;
  kills: number;
  deaths: number;
  joinedAt: number;
}

export interface MatchResultInput {
  matchId: string;
  mode: 'field-test-ffa';
  startedAt: number;
  endedAt: number;
  participants: MatchParticipantResult[];
}

/** Persists server-authoritative match results exactly once. */
export async function persistMatchResult(input: MatchResultInput): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.matchId)) throw new Error('Invalid match identifier.');
  if (!Number.isSafeInteger(input.startedAt) || !Number.isSafeInteger(input.endedAt) || input.endedAt < input.startedAt) {
    throw new Error('Invalid match timestamps.');
  }
  const participants = input.participants;
  if (participants.length === 0) return false;
  if (participants.length > 8) throw new Error('Too many match participants.');

  const seen = new Set<string>();
  for (const participant of participants) {
    if (!participant.uid || participant.uid.length > 128 || seen.has(participant.uid)) {
      throw new Error('Invalid or duplicate match participant.');
    }
    seen.add(participant.uid);
    for (const value of [participant.score, participant.kills, participant.deaths, participant.joinedAt]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid match participant statistics.');
    }
  }

  const ranked = [...participants].sort((a, b) => b.kills - a.kills || b.score - a.score);
  const winnerUid = ranked.length > 1 && ranked[0]!.kills > ranked[1]!.kills ? ranked[0]!.uid : null;
  const db = getFirestore(getFirebaseAdminApp());
  const matchRef = db.doc('matchSummaries/' + input.matchId);
  const statsRefs = participants.map((participant) => ({
    participant,
    ref: db.doc('playerStats/' + participant.uid)
  }));

  return db.runTransaction(async (transaction) => {
    const existingMatch = await transaction.get(matchRef);
    if (existingMatch.exists) return false;
    const statSnapshots = await Promise.all(statsRefs.map(({ ref }) => transaction.get(ref)));

    transaction.create(matchRef, {
      matchId: input.matchId,
      mode: input.mode,
      startedAt: Timestamp.fromMillis(input.startedAt),
      endedAt: Timestamp.fromMillis(input.endedAt),
      durationMs: input.endedAt - input.startedAt,
      participantUids: participants.map((participant) => participant.uid),
      winnerUid,
      results: participants.map((participant) => ({
        uid: participant.uid,
        score: participant.score,
        kills: participant.kills,
        deaths: participant.deaths,
        joinedAt: Timestamp.fromMillis(participant.joinedAt)
      })),
      createdAt: FieldValue.serverTimestamp()
    });

    statsRefs.forEach(({ participant, ref }, index) => {
      const previous = statSnapshots[index]!;
      const incremented = {
        matchesPlayed: FieldValue.increment(1),
        kills: FieldValue.increment(participant.kills),
        deaths: FieldValue.increment(participant.deaths),
        score: FieldValue.increment(participant.score),
        wins: FieldValue.increment(participant.uid === winnerUid ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp()
      };
      if (previous.exists) transaction.set(ref, incremented, { merge: true });
      else transaction.create(ref, {
        uid: participant.uid,
        matchesPlayed: 1,
        kills: participant.kills,
        deaths: participant.deaths,
        score: participant.score,
        wins: participant.uid === winnerUid ? 1 : 0,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    return true;
  });
}
