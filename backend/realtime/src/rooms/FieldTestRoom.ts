import { randomUUID } from 'node:crypto';
import { Client, Room } from 'colyseus';
import {
  clamp,
  isRecord,
  type PlayerSnapshot,
  type PrivatePlayerSnapshot,
  type RoomSnapshot,
  type TargetSnapshot
} from '../types.js';
import { parsePlayerInput } from '../validation.js';
import {
  canOccupyPosition,
  createPracticeTargets,
  resolveAuthoritativeShot,
  SPRINT_SPEED,
  updateTargetRespawns,
  WALK_SPEED,
  WEAPON_COOLDOWN_MS,
  WEAPON_MAGAZINE_SIZE,
  WEAPON_STARTING_RESERVE,
  type ServerCombatant,
  type ServerTarget,
  updatePlayerRespawns
} from '../world.js';

interface LocalAuth {
  playerId: string;
}

interface ServerPlayer extends PlayerSnapshot, ServerCombatant {
  lastSequence: number;
  moveX: number;
  moveZ: number;
  pitch: number;
  sprint: boolean;
  ammo: number;
  reserve: number;
  score: number;
  nextShotAt: number;
  reloadEndsAt: number;
}

const SERVER_STEP_MS = 50;
const MAX_PLAYERS_PER_TEST_ROOM = 8;
const RELOAD_DURATION_MS = 1350;

export class FieldTestRoom extends Room {
  private readonly players = new Map<string, ServerPlayer>();
  private readonly targets: ServerTarget[] = createPracticeTargets();

  override maxClients = MAX_PLAYERS_PER_TEST_ROOM;
  override maxMessagesPerSecond = 35;
  override patchRate = 50;

  override onCreate(): void {
    this.setMetadata({ mode: 'field-test', build: '0.3.0' });
    this.onMessage('input', (client, payload: unknown) => this.handleInput(client, payload));
    this.onMessage('reload', (client) => this.handleReload(client));
    this.setTimestep((deltaTime) => this.simulate(deltaTime), SERVER_STEP_MS);
  }

  override onAuth(_client: Client, options: unknown): LocalAuth {
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

  override onJoin(client: Client, _options: unknown, auth: LocalAuth): void {
    const spawnIndex = this.players.size;
    const player: ServerPlayer = {
      sessionId: client.sessionId,
      playerId: auth.playerId,
      x: spawnIndex % 2 === 0 ? -2 : 2,
      z: 5 + Math.floor(spawnIndex / 2) * 2,
      yaw: 0,
      pitch: -2.4,
      health: 100,
      respawnAt: 0,
      lastSequence: 0,
      moveX: 0,
      moveZ: 0,
      sprint: false,
      ammo: WEAPON_MAGAZINE_SIZE,
      reserve: WEAPON_STARTING_RESERVE,
      score: 0,
      nextShotAt: 0,
      reloadEndsAt: 0
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
      this.sendPrivateState(client, player);
      this.broadcastSnapshot();
    }, 25);
  }

  override onLeave(client: Client): void {
    this.players.delete(client.sessionId);
    this.broadcastSnapshot();
  }

  private handleInput(client: Client, payload: unknown): void {
    const player = this.players.get(client.sessionId);
    if (!player) return;

    const input = parsePlayerInput(payload, player.lastSequence);
    if (!input) return;

    player.lastSequence = input.sequence;
    if (player.health <= 0) {
      player.moveX = 0;
      player.moveZ = 0;
      player.sprint = false;
      return;
    }

    player.moveX = input.moveX;
    player.moveZ = input.moveZ;
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    player.sprint = input.sprint;

    if (input.shoot) this.handleShot(client, player);
  }

  private handleReload(client: Client): void {
    const player = this.players.get(client.sessionId);
    if (!player || player.health <= 0 || player.reloadEndsAt > Date.now()) return;
    if (player.ammo >= WEAPON_MAGAZINE_SIZE || player.reserve <= 0) return;

    player.reloadEndsAt = Date.now() + RELOAD_DURATION_MS;
    this.sendPrivateState(client, player);
  }

  private handleShot(client: Client, player: ServerPlayer): void {
    const now = Date.now();
    if (player.health <= 0 || player.reloadEndsAt > now || now < player.nextShotAt) return;

    if (player.ammo <= 0) {
      client.send('shot', { accepted: false, reason: 'empty' });
      player.nextShotAt = now + 250;
      return;
    }

    player.ammo -= 1;
    player.nextShotAt = now + WEAPON_COOLDOWN_MS;
    const result = resolveAuthoritativeShot(
      player.x,
      1.55,
      player.z,
      player.yaw,
      player.pitch,
      this.targets,
      now,
      client.sessionId,
      Array.from(this.players.values())
    );

    if (result.eliminated) player.score += 1;
    client.send('shot', {
      accepted: true,
      hit: result.hit,
      eliminated: result.eliminated,
      playerHit: result.playerSessionId !== null,
      targetId: result.targetId
    });
    this.sendPrivateState(client, player);
  }

  private simulate(deltaTimeMs: number): void {
    const deltaSeconds = clamp(deltaTimeMs / 1000, 0, 0.1);
    const now = Date.now();

    for (const [sessionId, player] of this.players) {
      if (player.health > 0) {
        const speed = player.sprint ? SPRINT_SPEED : WALK_SPEED;
        const deltaX = player.moveX * speed * deltaSeconds;
        const deltaZ = player.moveZ * speed * deltaSeconds;
        const nextX = player.x + deltaX;
        const nextZ = player.z + deltaZ;

        if (canOccupyPosition(nextX, player.z)) player.x = nextX;
        if (canOccupyPosition(player.x, nextZ)) player.z = nextZ;
      } else {
        player.moveX = 0;
        player.moveZ = 0;
        player.sprint = false;
      }

      if (player.health > 0 && player.reloadEndsAt > 0 && now >= player.reloadEndsAt) {
        const loaded = Math.min(WEAPON_MAGAZINE_SIZE - player.ammo, player.reserve);
        player.ammo += loaded;
        player.reserve -= loaded;
        player.reloadEndsAt = 0;
        const client = this.clients.find((candidate) => candidate.sessionId === sessionId);
        if (client) this.sendPrivateState(client, player);
      }
    }

    const respawned = updatePlayerRespawns(Array.from(this.players.values()), now);
    for (const player of respawned) {
      const spawnIndex = Array.from(this.players.keys()).indexOf(player.sessionId);
      player.x = spawnIndex % 2 === 0 ? -2 : 2;
      player.z = 5 + Math.floor(Math.max(0, spawnIndex) / 2) * 2;
      player.yaw = 0;
      player.pitch = -2.4;
      player.moveX = 0;
      player.moveZ = 0;
      player.sprint = false;
      player.ammo = WEAPON_MAGAZINE_SIZE;
      player.reserve = WEAPON_STARTING_RESERVE;
      player.nextShotAt = now + 250;
      player.reloadEndsAt = 0;

      const client = this.clients.find((candidate) => candidate.sessionId === player.sessionId);
      if (client) {
        client.send('respawn', { x: player.x, z: player.z });
        this.sendPrivateState(client, player);
      }
    }

    updateTargetRespawns(this.targets, now);
    this.broadcastSnapshot();
  }

  private sendPrivateState(client: Client, player: ServerPlayer): void {
    const state: PrivatePlayerSnapshot = {
      ammo: player.ammo,
      reserve: player.reserve,
      score: player.score
    };
    client.send('self', state);
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
      })),
      targets: this.targets.map((target): TargetSnapshot => ({
        targetId: target.targetId,
        health: target.health,
        active: target.active
      }))
    };

    this.broadcast('snapshot', snapshot);
  }
}
