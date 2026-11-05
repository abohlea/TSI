export type TeamId = 'alpha' | 'bravo';
export type TeamMatchPhase = 'active' | 'intermission' | 'finished';
export type RoundFinishReason = 'score-limit' | 'time-limit';

export interface TeamMatchConfig {
  bestOf: 3;
  roundDurationMs: number;
  intermissionMs: number;
  scoreLimit: number;
}

export interface TeamMatchState {
  phase: TeamMatchPhase;
  round: number;
  roundsToWin: number;
  roundWins: Record<TeamId, number>;
  roundScore: Record<TeamId, number>;
  matchScore: Record<TeamId, number>;
  roundStartedAt: number;
  roundEndsAt: number;
  intermissionEndsAt: number | null;
  winner: TeamId | null;
  finishReason: RoundFinishReason | null;
}

export const DEFAULT_TEAM_MATCH_CONFIG: Readonly<TeamMatchConfig> = Object.freeze({
  bestOf: 3,
  roundDurationMs: 180_000,
  intermissionMs: 8_000,
  scoreLimit: 5
});

export function assignBalancedTeam(alphaCount: number, bravoCount: number): TeamId {
  if (!Number.isSafeInteger(alphaCount) || alphaCount < 0 ||
      !Number.isSafeInteger(bravoCount) || bravoCount < 0) {
    throw new Error('Invalid team population.');
  }
  return alphaCount <= bravoCount ? 'alpha' : 'bravo';
}

export function createTeamMatch(now: number, config: TeamMatchConfig = DEFAULT_TEAM_MATCH_CONFIG): TeamMatchState {
  if (!Number.isSafeInteger(now) || now < 0 ||
      config.bestOf !== 3 ||
      !Number.isSafeInteger(config.roundDurationMs) || config.roundDurationMs < 10_000 ||
      !Number.isSafeInteger(config.intermissionMs) || config.intermissionMs < 0 ||
      !Number.isSafeInteger(config.scoreLimit) || config.scoreLimit < 1) {
    throw new Error('Invalid team match configuration.');
  }
  return {
    phase: 'active',
    round: 1,
    roundsToWin: Math.ceil(config.bestOf / 2),
    roundWins: { alpha: 0, bravo: 0 },
    roundScore: { alpha: 0, bravo: 0 },
    matchScore: { alpha: 0, bravo: 0 },
    roundStartedAt: now,
    roundEndsAt: now + config.roundDurationMs,
    intermissionEndsAt: null,
    winner: null,
    finishReason: null
  };
}

function closeRound(state: TeamMatchState, now: number, winner: TeamId | null, reason: RoundFinishReason, config: TeamMatchConfig): TeamMatchState {
  const wins = { ...state.roundWins };
  if (winner) wins[winner] += 1;
  const matchWinner = winner && wins[winner] >= state.roundsToWin ? winner : null;
  if (matchWinner) {
    return { ...state, phase: 'finished', roundWins: wins, winner: matchWinner, finishReason: reason, intermissionEndsAt: null };
  }
  if (state.round >= config.bestOf) {
    return { ...state, phase: 'finished', roundWins: wins, winner: null, finishReason: reason, intermissionEndsAt: null };
  }
  return {
    ...state,
    phase: 'intermission',
    roundWins: wins,
    round: state.round + 1,
    roundScore: { alpha: 0, bravo: 0 },
    intermissionEndsAt: now + config.intermissionMs,
    finishReason: reason
  };
}

export function recordTeamElimination(
  state: TeamMatchState,
  scoringTeam: TeamId,
  now: number,
  config: TeamMatchConfig = DEFAULT_TEAM_MATCH_CONFIG
): TeamMatchState {
  if (state.phase !== 'active' || now >= state.roundEndsAt) return state;
  const roundScore = { ...state.roundScore, [scoringTeam]: state.roundScore[scoringTeam] + 1 };
  const matchScore = { ...state.matchScore, [scoringTeam]: state.matchScore[scoringTeam] + 1 };
  const updated = { ...state, roundScore, matchScore };
  return roundScore[scoringTeam] >= config.scoreLimit
    ? closeRound(updated, now, scoringTeam, 'score-limit', config)
    : updated;
}

export function advanceTeamMatch(
  state: TeamMatchState,
  now: number,
  config: TeamMatchConfig = DEFAULT_TEAM_MATCH_CONFIG
): TeamMatchState {
  if (state.phase === 'finished') return state;
  if (state.phase === 'active' && now >= state.roundEndsAt) {
    const { alpha, bravo } = state.roundScore;
    return closeRound(state, state.roundEndsAt, alpha === bravo ? null : alpha > bravo ? 'alpha' : 'bravo', 'time-limit', config);
  }
  if (state.phase === 'intermission' && state.intermissionEndsAt !== null && now >= state.intermissionEndsAt) {
    return {
      ...state,
      phase: 'active',
      roundStartedAt: state.intermissionEndsAt,
      roundEndsAt: state.intermissionEndsAt + config.roundDurationMs,
      intermissionEndsAt: null,
      roundScore: { alpha: 0, bravo: 0 },
      finishReason: null
    };
  }
  return state;
}
