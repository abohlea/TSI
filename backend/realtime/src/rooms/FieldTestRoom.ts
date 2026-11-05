import { randomUUID } from 'node:crypto';
import { Client, Room } from 'colyseus';
import { clamp, isFiniteNumber, isRecord, type PlayerSnapshot, type RoomSnapshot } from '../types.js';

interface LocalAuth {
  playerId: string;
}

interface ServerPlayer extends PlayerSnapshot {
  lastSequence: number;
  moveX: number;
  moveZ: number;
  sprint: boolean;
}

const WORLD_LIMIT = 48;
const WALK_SPEED = 5.2;
const SPRINT_SPEED = 8.2;
const MAX_INPUT_STEP = 120;
const SERVER_STEP_MS = 50;
const MAX_PLAYERS_PER_TEST_ROOM = 8;

export class FieldTestRoom extends Room {
  private readonly players = new Map<string, ServerPlayer>();

  override maxClients = MAX_PLAYERS_PER_TEST_ROOM;
  override maxMessagesPerSecond = 35;
  override patchRate = 50;

  onCreate(): void {
    this.setMetadata({ mode: 'field-test', build: '0.1.0' });
    this.onMessage('input', (client, payload: unknown) => this.handleInput(client, payload));
    this.setSimulationInterval((deltaTime) => this.simulate(deltaTime), SERVER_STEP_MS);
  }

  onAuth(_client: Client, options: unknown): LocalAuth {
    // Never allow the shared development token to authenticate a production room.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Local development authentication is disabled in production.');
    }

    if (process.env.TSI_ENABLE_LOCAL_AUTH !== 'true') {
      throw new Error('Local room authentication is not enabled.');
    }

    const expectedToken = process.env.TSI_LOCAL_DEV_TOKEN;
    if (!expectedToken || !isRecord(options) || typeof options.devToken !== 'string') {
      throw new Error('A local development token is required.');
    }

    if (options.devToken.length < 24 || options.devToken !== expectedToken) {
      throw new Error('Invalid local development token.');
    }

    return { playerId: randomUUID() };
  }

  onJoin(client: Client, _options: unknown, auth: LocalAuth): void {
    const player: ServerPlayer = {
      playerId: auth.playerId,
      x: (this.players.size % 2 === 0 ? -2 : 2),
      z: 5 + Math.floor(this.players.size / 2) * 2,
      yaw: 0,
      health: 100,
      lastSequence: 0,
      moveX: 0,
      moveZ: 0,
      sprint: false
    };

    this.players.set(client.sessionId, player);
    this.clock.setTimeout(() => {
      if (!this.players.has(client.sessionId)) return;
      client.send('welcome', {
        playerId: player.playerId,
        roomId: this.roomId,
        x: player.x,
        z: player.z,
        serverStepMs: SERVER_STEP_MS
      });
    }, 25);
    this.broadcastSnapshot();
  }

  onLeave(client: Client): void {
    this.players.delete(client.sessionId);
    this.broadcastSnapshot();
  }

  private handleInput(client: Client, payload: unknown): void {
    const player = this.players.get(client.sessionId);
    if (!player || !isRecord(payload)) return;

    const sequence = payload.sequence;
    const moveX = payload.moveX;
    const moveZ = payload.moveZ;
    const yaw = payload.yaw;

    if (
      !isFiniteNumber(sequence) ||
      !Number.isSafeInteger(sequence) ||
      sequence <= player.lastSequence ||
      sequence - player.lastSequence > MAX_INPUT_STEP ||
      !isFiniteNumber(moveX) ||
      !isFiniteNumber(moveZ) ||
      !isFiniteNumber(yaw) ||
      typeof payload.sprint !== 'boolean'
    ) {
      return;
    }

    const normalizedX = clamp(moveX, -1, 1);
    const normalizedZ = clamp(moveZ, -1, 1);
    const magnitude = Math.hypot(normalizedX, normalizedZ);
    const factor = magnitude > 1 ? 1 / magnitude : 1;

    player.lastSequence = sequence;
    player.moveX = normalizedX * factor;
    player.moveZ = normalizedZ * factor;
    player.yaw = ((yaw % 360) + 360) % 360;
    player.sprint = payload.sprint;
  }

  private simulate(deltaTimeMs: number): void {
    const deltaSeconds = clamp(deltaTimeMs / 1000, 0, 0.1);

    for (const player of this.players.values()) {
      const speed = player.sprint ? SPRINT_SPEED : WALK_SPEED;
      player.x = clamp(player.x + player.moveX * speed * deltaSeconds, -WORLD_LIMIT, WORLD_LIMIT);
      player.z = clamp(player.z + player.moveZ * speed * deltaSeconds, -WORLD_LIMIT, WORLD_LIMIT);
    }

    this.broadcastSnapshot();
  }

  private broadcastSnapshot(): void {
    const snapshot: RoomSnapshot = {
      serverTime: Date.now(),
      players: Array.from(this.players.values(), (player): PlayerSnapshot => ({
        playerId: player.playerId,
        x: player.x,
        z: player.z,
        yaw: player.yaw,
        health: player.health
      }))
    };

    this.broadcast('snapshot', snapshot);
  }
}
