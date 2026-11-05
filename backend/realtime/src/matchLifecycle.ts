export type MatchPhase = 'countdown' | 'active' | 'finished';

export interface MatchLifecycleConfig {
  countdownMs: number;
  durationMs: number;
  scoreLimit: number;
}

export interface MatchLifecycleState {
  phase: MatchPhase;
  createdAt: number;
  startsAt: number;
  endsAt: number;
  finishedAt: number | null;
  winnerUid: string | null;
  finishReason: 'score-limit' | 'time-limit' | null;
}

export const DEFAULT_MATCH_CONFIG: Readonly<MatchLifecycleConfig> = Object.freeze({
  countdownMs: 5_000,
  durationMs: 10 * 60_000,
  scoreLimit: 20
});

export function createMatchLifecycle(now: number, config: MatchLifecycleConfig = DEFAULT_MATCH_CONFIG): MatchLifecycleState {
  if (!Number.isSafeInteger(now) || now < 0 ||
      !Number.isSafeInteger(config.countdownMs) || config.countdownMs < 0 ||
      !Number.isSafeInteger(config.durationMs) || config.durationMs < 1_000 ||
      !Number.isSafeInteger(config.scoreLimit) || config.scoreLimit < 1) {
    throw new Error('Invalid match lifecycle configuration.');
  }
  return {
    phase: 'countdown',
    createdAt: now,
    startsAt: now + config.countdownMs,
    endsAt: now + config.countdownMs + config.durationMs,
    finishedAt: null,
    winnerUid: null,
    finishReason: null
  };
}

export function advanceMatchLifecycle(state: MatchLifecycleState, now: number): MatchLifecycleState {
  if (state.phase === 'countdown' && now >= state.startsAt) {
    return { ...state, phase: 'active' };
  }
  if (state.phase === 'active' && now >= state.endsAt) {
    return { ...state, phase: 'finished', finishedAt: state.endsAt, finishReason: 'time-limit' };
  }
  return state;
}

export function finishMatchLifecycle(
  state: MatchLifecycleState,
  now: number,
  winnerUid: string | null,
  reason: 'score-limit' | 'time-limit' = 'score-limit'
): MatchLifecycleState {
  if (state.phase !== 'active') return state;
  return {
    ...state,
    phase: 'finished',
    finishedAt: Math.max(state.startsAt, Math.min(now, state.endsAt)),
    winnerUid,
    finishReason: reason
  };
}

export function getMatchRemainingMs(state: MatchLifecycleState, now: number): number {
  if (state.phase === 'countdown') return Math.max(0, state.startsAt - now);
  if (state.phase === 'active') return Math.max(0, state.endsAt - now);
  return 0;
}
