import { Client, type Room } from '@colyseus/sdk';

export interface NetworkInput {
  sequence: number;
  moveX: number;
  moveZ: number;
  yaw: number;
  sprint: boolean;
}

export interface NetworkPlayerSnapshot {
  playerId: string;
  x: number;
  z: number;
  yaw: number;
  health: number;
}

export interface NetworkSnapshot {
  serverTime: number;
  players: NetworkPlayerSnapshot[];
}

export interface NetworkCallbacks {
  onStatus(message: string): void;
  onWelcome?(playerId: string, spawn: { x: number; z: number }): void;
  onSnapshot(snapshot: NetworkSnapshot): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): NetworkSnapshot | null {
  if (!isRecord(value) || typeof value.serverTime !== 'number' || !Array.isArray(value.players)) {
    return null;
  }

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

  return { serverTime: value.serverTime, players };
}

/**
 * Development-only Colyseus connection.
 * The local token is deliberately not a production authentication system.
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

  async connect(url: string, devToken: string, callbacks: NetworkCallbacks): Promise<void> {
    if (this.room) return;
    if (!url.trim()) throw new Error('URL du serveur local absente.');
    if (devToken.length < 24) throw new Error('Le jeton local doit contenir au moins 24 caractères.');

    callbacks.onStatus('Connexion au serveur de test…');
    const client = new Client(url);
    const room = await client.joinOrCreate('field_test', { devToken });
    this.room = room;
    this.sequence = 0;

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

    room.onLeave((code) => {
      this.room = null;
      this._playerId = null;
      callbacks.onStatus(`Connexion fermée · code ${code}`);
    });

    callbacks.onStatus('Connecté · attente du joueur…');
  }

  sendInput(input: Omit<NetworkInput, 'sequence'>): void {
    if (!this.room) return;
    this.sequence += 1;
    this.room.send('input', { ...input, sequence: this.sequence });
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    this._playerId = null;
    if (room) await room.leave();
  }
}
