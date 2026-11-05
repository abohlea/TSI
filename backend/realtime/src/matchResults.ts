import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from './firebaseAuth.js';

export interface MatchParticipantResult {
  uid: string;
  score: number;
  kills: number;
  deaths: number;
  joinedAt: number;
  team?: 'alpha' | 'bravo';
}

export interface MatchResultInput {
  matchId: string;
  mode: 'field-test-ffa' | 'field-test-teams';
  winnerTeam?: 'alpha' | 'bravo' | null;
  teamWins?: { alpha: number; bravo: number };
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
  const participantLimit = input.mode === 'field-test-teams' ? 10 : 8;
  if (participants.length > participantLimit) throw new Error('Too many match participants.');

  const seen = new Set<string>();
  for (const participant of participants) {
    if (!participant.uid || participant.uid.length > 128 || seen.has(participant.uid)) {
      throw new Error('Invalid or duplicate match participant.');
    }
    if (participant.team !== undefined && participant.team !== 'alpha' && participant.team !== 'bravo') throw new Error('Invalid participant team.');
    if (input.mode === 'field-test-teams' && !participant.team) throw new Error('Team participant is missing a team.');
    seen.add(participant.uid);
    for (const value of [participant.score, participant.kills, participant.deaths, participant.joinedAt]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid match participant statistics.');
    }
  }

  const ranked = [...participants].sort((a, b) => b.score - a.score || b.kills - a.kills);
  const winnerUid = input.mode === 'field-test-teams' ? null : ranked.length > 0 && (
    ranked.length === 1 || ranked[0]!.score > ranked[1]!.score ||
    (ranked[0]!.score === ranked[1]!.score && ranked[0]!.kills > ranked[1]!.kills)
  ) ? ranked[0]!.uid : null;
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
      winnerTeam: input.winnerTeam ?? null,
      teamWins: input.teamWins ?? null,
      results: participants.map((participant) => ({
        uid: participant.uid,
        score: participant.score,
        kills: participant.kills,
        deaths: participant.deaths,
        ...(participant.team ? { team: participant.team } : {}),
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
        wins: FieldValue.increment(input.winnerTeam ? participant.team === input.winnerTeam ? 1 : 0 : participant.uid === winnerUid ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp()
      };
      if (previous.exists) transaction.set(ref, incremented, { merge: true });
      else transaction.create(ref, {
        uid: participant.uid,
        matchesPlayed: 1,
        kills: participant.kills,
        deaths: participant.deaths,
        score: participant.score,
        wins: input.winnerTeam ? participant.team === input.winnerTeam ? 1 : 0 : participant.uid === winnerUid ? 1 : 0,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    return true;
  });
}
