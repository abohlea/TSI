import { Client, type Room } from '@colyseus/sdk';

export interface NetworkPlayerSnapshot {
  playerId: string;
  x: number;
  z: number;
  yaw: number;
  health: number;
}

export interface NetworkTargetSnapshot {
  targetId: string;
  health: number;
  active: boolean;
}

export interface NetworkPrivateState {
  ammo: number;
  reserve: number;
  score: number;
}

export interface NetworkSnapshot {
  serverTime: number;
  players: NetworkPlayerSnapshot[];
  targets: NetworkTargetSnapshot[];
}

export interface NetworkMatchState {
  phase: 'countdown' | 'active' | 'finished';
  startsAt: number;
  endsAt: number;
  remainingMs: number;
  scoreLimit: number;
  winnerUid: string | null;
  finishReason: 'score-limit' | 'time-limit' | null;
}

export interface NetworkShotResult {
  accepted: boolean;
  hit?: boolean;
  eliminated?: boolean;
  reason?: string;
  targetPlayerId?: string;
}

export interface NetworkTeamPlayer {
  playerId: string;
  team: 'alpha' | 'bravo';
  x: number;
  z: number;
  yaw: number;
  health: number;
  score: number;
  connected?: boolean;
}

export interface NetworkTeamMatchState {
  mode: 'teams-5v5';
  phase: 'active' | 'intermission' | 'finished';
  round: number;
  roundWins: { alpha: number; bravo: number };
  roundScore: { alpha: number; bravo: number };
  matchScore: { alpha: number; bravo: number };
  roundEndsAt: number;
  intermissionEndsAt: number | null;
  winner: 'alpha' | 'bravo' | null;
  remainingMs: number;
}

export interface NetworkCallbacks {
  onStatus(message: string): void;
  onWelcome?(playerId: string, spawn: { x: number; z: number }): void;
  onSnapshot(snapshot: NetworkSnapshot): void;
  onSelf?(state: NetworkPrivateState): void;
  onShot?(result: NetworkShotResult): void;
  onMatchState?(state: NetworkMatchState): void;
  onMatchEnded?(state: NetworkMatchState): void;
  onTeamMatchState?(state: NetworkTeamMatchState): void;
  onTeamWelcome?(team: 'alpha' | 'bravo'): void;
  onTeamPlayers?(players: NetworkTeamPlayer[]): void;
}

export function getSessionTicketEndpoint(serverUrl: string): string {
  const endpoint = new URL('/auth/session-ticket', serverUrl);
  if (endpoint.protocol === 'ws:') endpoint.protocol = 'http:';
  else if (endpoint.protocol === 'wss:') endpoint.protocol = 'https:';
  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    throw new Error('URL du serveur incompatible avec l’authentification HTTP.');
  }
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): NetworkSnapshot | null {
  if (
    !isRecord(value) ||
    typeof value.serverTime !== 'number' ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.targets)
  ) return null;

  const players: NetworkPlayerSnapshot[] = [];
  for (const candidate of value.players) {
    if (!isRecord(candidate)) continue;
    const { playerId, x, z, yaw, health } = candidate;
    if (
      typeof playerId !== 'string' ||
      typeof x !== 'number' || !Number.isFinite(x) ||
      typeof z !== 'number' || !Number.isFinite(z) ||
      typeof yaw !== 'number' || !Number.isFinite(yaw) ||
      typeof health !== 'number' || !Number.isFinite(health)
    ) continue;
    players.push({ playerId, x, z, yaw, health });
  }

  const targets: NetworkTargetSnapshot[] = [];
  for (const candidate of value.targets) {
    if (!isRecord(candidate)) continue;
    const { targetId, health, active } = candidate;
    if (
      typeof targetId !== 'string' ||
      typeof health !== 'number' || !Number.isFinite(health) ||
      typeof active !== 'boolean'
    ) continue;
    targets.push({ targetId, health, active });
  }

  return { serverTime: value.serverTime, players, targets };
}

function parseMatchState(value: unknown): NetworkMatchState | null {
  if (!isRecord(value) ||
      (value.phase !== 'countdown' && value.phase !== 'active' && value.phase !== 'finished') ||
      typeof value.startsAt !== 'number' || !Number.isFinite(value.startsAt) ||
      typeof value.endsAt !== 'number' || !Number.isFinite(value.endsAt) ||
      typeof value.remainingMs !== 'number' || !Number.isFinite(value.remainingMs) ||
      typeof value.scoreLimit !== 'number' || !Number.isInteger(value.scoreLimit) ||
      !(typeof value.winnerUid === 'string' || value.winnerUid === null) ||
      !(value.finishReason === 'score-limit' || value.finishReason === 'time-limit' || value.finishReason === null)) return null;
  return { phase: value.phase, startsAt: value.startsAt, endsAt: value.endsAt, remainingMs: value.remainingMs,
    scoreLimit: value.scoreLimit, winnerUid: value.winnerUid, finishReason: value.finishReason };
}

function parsePrivateState(value: unknown): NetworkPrivateState | null {
  if (!isRecord(value)) return null;
  const { ammo, reserve, score } = value;
  if (
    typeof ammo !== 'number' || !Number.isInteger(ammo) || ammo < 0 ||
    typeof reserve !== 'number' || !Number.isInteger(reserve) || reserve < 0 ||
    typeof score !== 'number' || !Number.isInteger(score) || score < 0
  ) return null;
  return { ammo, reserve, score };
}

/**
 * Development-only Colyseus connection.
 * The local token is not a production authentication mechanism.
 */
export class TsiNetworkClient {
  private room: Room | null = null;
  private sequence = 0;
  private _playerId: string | null = null;

  get connected(): boolean {
    return this.room !== null;
  }

  get playerId(): string | null {
    return this._playerId;
  }

  async connect(url: string, devToken: string, callbacks: NetworkCallbacks, getIdToken?: () => Promise<string>, roomName: 'field_test' | 'team_match' = 'field_test'): Promise<void> {
    if (this.room) return;
    if (!url.trim()) throw new Error('URL du serveur local absente.');
    if (!getIdToken && devToken.length < 24) throw new Error('Le jeton local doit contenir au moins 24 caractères.');

    callbacks.onStatus('Connexion au serveur de test…');
    const client = new Client(url);
    let room: Room;
    if (getIdToken) {
      const idToken = await getIdToken();
      const ticketUrl = getSessionTicketEndpoint(url);
      const response = await fetch(ticketUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + idToken }
      });
      if (!response.ok) throw new Error('Échec de création du ticket de session (HTTP ' + response.status + ').');
      const payload: unknown = await response.json();
      if (!isRecord(payload) || typeof payload.sessionTicket !== 'string') {
        throw new Error('Réponse de ticket de session invalide.');
      }
      room = await client.joinOrCreate(roomName, { sessionTicket: payload.sessionTicket });
    } else {
      room = await client.joinOrCreate(roomName, { devToken });
    }
    this.room = room;
    this.sequence = 0;

    room.onMessage('team-welcome', (payload: unknown) => {
      if (
        !isRecord(payload) ||
        (payload.team !== 'alpha' && payload.team !== 'bravo') ||
        typeof payload.playerId !== 'string' ||
        typeof payload.x !== 'number' || !Number.isFinite(payload.x) ||
        typeof payload.z !== 'number' || !Number.isFinite(payload.z)
      ) return;

      this._playerId = payload.playerId;
      callbacks.onTeamWelcome?.(payload.team);
      callbacks.onWelcome?.(payload.playerId, { x: payload.x, z: payload.z });
      callbacks.onStatus('CONNECTÉ · ÉQUIPE ' + payload.team.toUpperCase());
    });

    room.onMessage('team-players', (payload: unknown) => {
      if (!Array.isArray(payload)) return;
      const players: NetworkTeamPlayer[] = [];
      for (const candidate of payload) {
        if (!isRecord(candidate) || typeof candidate.playerId !== 'string' ||
            (candidate.team !== 'alpha' && candidate.team !== 'bravo') ||
            ![candidate.x, candidate.z, candidate.yaw, candidate.health, candidate.score].every((v) => typeof v === 'number' && Number.isFinite(v))) continue;
        players.push({ playerId: candidate.playerId, team: candidate.team,
          x: candidate.x as number, z: candidate.z as number, yaw: candidate.yaw as number,
          health: candidate.health as number, score: candidate.score as number,
          ...(typeof candidate.connected === 'boolean' ? { connected: candidate.connected } : {}) });
      }
      callbacks.onTeamPlayers?.(players);
    });

    room.onMessage('team-self', (payload: unknown) => {
      const state = parsePrivateState(payload);
      if (state) callbacks.onSelf?.(state);
    });

    room.onMessage('team-shot', (payload: unknown) => {
      if (!isRecord(payload) || typeof payload.accepted !== 'boolean') return;
      callbacks.onShot?.({ accepted: payload.accepted,
        ...(typeof payload.hit === 'boolean' ? { hit: payload.hit } : {}),
        ...(typeof payload.eliminated === 'boolean' ? { eliminated: payload.eliminated } : {}) });
    });

    room.onMessage('team-match-state', (payload: unknown) => {
      if (!isRecord(payload) || payload.mode !== 'teams-5v5' ||
          (payload.phase !== 'active' && payload.phase !== 'intermission' && payload.phase !== 'finished') ||
          typeof payload.round !== 'number' || !isRecord(payload.roundWins) ||
          !isRecord(payload.roundScore) || !isRecord(payload.matchScore) ||
          typeof payload.roundEndsAt !== 'number' || typeof payload.remainingMs !== 'number') return;
      const alphaWins = payload.roundWins.alpha; const bravoWins = payload.roundWins.bravo;
      const alphaRound = payload.roundScore.alpha; const bravoRound = payload.roundScore.bravo;
      const alphaMatch = payload.matchScore.alpha; const bravoMatch = payload.matchScore.bravo;
      if (![alphaWins, bravoWins, alphaRound, bravoRound, alphaMatch, bravoMatch].every((v) => typeof v === 'number' && Number.isFinite(v))) return;
      callbacks.onTeamMatchState?.({
        mode: 'teams-5v5', phase: payload.phase, round: payload.round,
        roundWins: { alpha: alphaWins as number, bravo: bravoWins as number },
        roundScore: { alpha: alphaRound as number, bravo: bravoRound as number },
        matchScore: { alpha: alphaMatch as number, bravo: bravoMatch as number },
        roundEndsAt: payload.roundEndsAt,
        intermissionEndsAt: typeof payload.intermissionEndsAt === 'number' ? payload.intermissionEndsAt : null,
        winner: payload.winner === 'alpha' || payload.winner === 'bravo' ? payload.winner : null,
        remainingMs: payload.remainingMs
      });
    });

    room.onMessage('welcome', (payload: unknown) => {
      if (!isRecord(payload) || typeof payload.playerId !== 'string') return;
      this._playerId = payload.playerId;
      const x = typeof payload.x === 'number' ? payload.x : 0;
      const z = typeof payload.z === 'number' ? payload.z : 0;
      callbacks.onWelcome?.(payload.playerId, { x, z });
      callbacks.onStatus('SERVEUR LOCAL CONNECTÉ');
    });

    room.onMessage('snapshot', (payload: unknown) => {
      const snapshot = parseSnapshot(payload);
      if (snapshot) callbacks.onSnapshot(snapshot);
    });

    room.onMessage('match-state', (payload: unknown) => {
      const state = parseMatchState(payload);
      if (state) callbacks.onMatchState?.(state);
    });

    room.onMessage('match-ended', (payload: unknown) => {
      const state = parseMatchState(payload);
      if (state) callbacks.onMatchEnded?.(state);
    });

    room.onMessage('self', (payload: unknown) => {
      const state = parsePrivateState(payload);
      if (state) callbacks.onSelf?.(state);
    });

    room.onMessage('shot', (payload: unknown) => {
      if (!isRecord(payload) || typeof payload.accepted !== 'boolean') return;
      callbacks.onShot?.({
        accepted: payload.accepted,
        ...(typeof payload.hit === 'boolean' ? { hit: payload.hit } : {}),
        ...(typeof payload.eliminated === 'boolean' ? { eliminated: payload.eliminated } : {}),
        ...(typeof payload.reason === 'string' ? { reason: payload.reason } : {}),
        ...(typeof payload.targetPlayerId === 'string' ? { targetPlayerId: payload.targetPlayerId } : {})
      });
    });

    room.onDrop(() => {
      callbacks.onStatus('Connexion interrompue · reconnexion automatique…');
    });
    room.onReconnect(() => {
      callbacks.onStatus('Reconnexion réussie · session restaurée');
    });

    room.onLeave((code) => {
      this.room = null;
      this._playerId = null;
      callbacks.onStatus(`Connexion fermée · code ${code}`);
    });

    callbacks.onStatus('Connecté · attente du joueur…');
  }

  sendInput(input: {
    moveX: number;
    moveZ: number;
    yaw: number;
    pitch: number;
    sprint: boolean;
    shoot: boolean;
  }): void {
    if (!this.room) return;
    this.sequence += 1;
    this.room.send('input', { ...input, sequence: this.sequence });
  }

  sendFire(): void {
    this.room?.send('fire');
  }

  sendReload(): void {
    this.room?.send('reload');
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    this._playerId = null;
    if (room) await room.leave();
  }
}
