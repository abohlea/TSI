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
import { consumeSessionTicket } from '../sessionTickets.js';
import { persistMatchResult, type MatchParticipantResult } from '../matchResults.js';
import { advanceMatchLifecycle, createMatchLifecycle, DEFAULT_MATCH_CONFIG, finishMatchLifecycle, getMatchRemainingMs } from '../matchLifecycle.js';
import {
  canOccupyPosition,
  createPracticeTargets,
  findSpawnPosition,
  resolveAuthoritativeShot,
  SPRINT_SPEED,
  updateTargetRespawns,
  WALK_SPEED,
  WEAPON_COOLDOWN_MS,
  WEAPON_MAGAZINE_SIZE,
  WEAPON_STARTING_RESERVE,
  type ServerTarget,
  resolveAuthoritativePlayerShot
} from '../world.js';

interface LocalAuth {
  playerId: string;
  persistent: boolean;
}

interface ServerPlayer extends PlayerSnapshot {
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
  respawnAt: number;
}

const SERVER_STEP_MS = 50;
const MAX_PLAYERS_PER_TEST_ROOM = 8;
const RELOAD_DURATION_MS = 1350;
const PLAYER_RESPAWN_DELAY_MS = 4000;

export class FieldTestRoom extends Room {
  private readonly players = new Map<string, ServerPlayer>();
  private readonly targets: ServerTarget[] = createPracticeTargets();
  private readonly participants = new Map<string, MatchParticipantResult>();
  private readonly match = createMatchLifecycle(Date.now());
  private matchPersistenceStarted = false;

  override maxClients = MAX_PLAYERS_PER_TEST_ROOM;
  override maxMessagesPerSecond = 35;
  override patchRate = 50;

  override onCreate(): void {
    this.setMetadata({ mode: 'field-test-ffa', build: '0.3.0' });
    this.broadcastMatchState();
    this.onMessage('input', (client, payload: unknown) => this.handleInput(client, payload));
    this.onMessage('reload', (client) => this.handleReload(client));
    this.onMessage('fire', (client) => {
      const player = this.players.get(client.sessionId);
      if (player) this.handleShot(client, player);
    });
    this.setTimestep((deltaTime) => this.simulate(deltaTime), SERVER_STEP_MS);
  }

  override async onAuth(_client: Client, options: unknown): Promise<LocalAuth> {
    if (isRecord(options) && typeof options.sessionTicket === 'string') {
      return { ...consumeSessionTicket(options.sessionTicket), persistent: true };
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('A short-lived game session ticket is required.');
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
    return { playerId: randomUUID(), persistent: false };
  }

  override onJoin(client: Client, _options: unknown, auth: LocalAuth): void {
    if (this.match.phase === 'finished') throw new Error('This match has already finished.');
    const spawn = findSpawnPosition(Array.from(this.players.values()).filter((candidate) => candidate.health > 0));
    if (!spawn) throw new Error('No free player spawn position is available.');

    const player: ServerPlayer = {
      playerId: auth.playerId,
      x: spawn.x,
      z: spawn.z,
      yaw: 0,
      pitch: -2.4,
      health: 100,
      lastSequence: 0,
      moveX: 0,
      moveZ: 0,
      sprint: false,
      ammo: WEAPON_MAGAZINE_SIZE,
      reserve: WEAPON_STARTING_RESERVE,
      score: 0,
      nextShotAt: 0,
      reloadEndsAt: 0,
      respawnAt: 0
    };

    this.players.set(client.sessionId, player);
    if (auth.persistent && !this.participants.has(auth.playerId)) {
      this.participants.set(auth.playerId, { uid: auth.playerId, score: 0, kills: 0, deaths: 0, joinedAt: Date.now() });
    }
    this.clock.setTimeout(() => {
      if (!this.players.has(client.sessionId)) return;
      client.send('welcome', {
        playerId: player.playerId,
        roomId: this.roomId,
        x: player.x,
        z: player.z,
        serverStepMs: SERVER_STEP_MS
      });
      client.send('match-state', this.matchStatePayload());
      this.sendPrivateState(client, player);
      this.broadcastSnapshot();
    }, 25);
  }

  override onLeave(client: Client): void {
    this.players.delete(client.sessionId);
    this.broadcastSnapshot();
  }

  override async onDispose(): Promise<void> {
    await this.persistFinalResult(Date.now());
  }

  private handleInput(client: Client, payload: unknown): void {
    const player = this.players.get(client.sessionId);
    if (!player) return;

    const input = parsePlayerInput(payload, player.lastSequence);
    if (!input) return;

    player.lastSequence = input.sequence;
    player.moveX = input.moveX;
    player.moveZ = input.moveZ;
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    player.sprint = input.sprint;

    if (input.shoot) this.handleShot(client, player);
  }

  private handleReload(client: Client): void {
    const player = this.players.get(client.sessionId);
    if (!player || this.match.phase !== 'active' || player.health <= 0 || player.reloadEndsAt > Date.now()) return;
    if (player.ammo >= WEAPON_MAGAZINE_SIZE || player.reserve <= 0) return;

    player.reloadEndsAt = Date.now() + RELOAD_DURATION_MS;
    this.sendPrivateState(client, player);
  }

  private handleShot(client: Client, player: ServerPlayer): void {
    const now = Date.now();
    if (this.match.phase !== 'active' || player.health <= 0 || player.reloadEndsAt > now || now < player.nextShotAt) return;

    if (player.ammo <= 0) {
      client.send('shot', { accepted: false, reason: 'empty' });
      player.nextShotAt = now + 250;
      return;
    }

    player.ammo -= 1;
    player.nextShotAt = now + WEAPON_COOLDOWN_MS;
    const playerHit = resolveAuthoritativePlayerShot(
      player.playerId,
      player.x,
      1.55,
      player.z,
      player.yaw,
      player.pitch,
      Array.from(this.players.values())
    );

    if (playerHit.hit) {
      const victim = Array.from(this.players.values()).find(
        (candidate) => candidate.playerId === playerHit.targetPlayerId
      );
      if (playerHit.eliminated && victim) {
        victim.respawnAt = now + PLAYER_RESPAWN_DELAY_MS;
        victim.moveX = 0;
        victim.moveZ = 0;
        player.score += 1;
        const killerResult = this.participants.get(player.playerId);
        if (killerResult) { killerResult.score += 1; killerResult.kills += 1; }
        const victimResult = this.participants.get(victim.playerId);
        if (victimResult) victimResult.deaths += 1;
        this.broadcast('player-eliminated', {
          killerId: player.playerId,
          playerId: victim.playerId,
          respawnAt: victim.respawnAt
        });
      }
      client.send('shot', {
        accepted: true,
        hit: true,
        eliminated: playerHit.eliminated,
        targetPlayerId: playerHit.targetPlayerId
      });
      this.sendPrivateState(client, player);
      this.broadcastSnapshot();
      return;
    }

    const result = resolveAuthoritativeShot(
      player.x,
      1.55,
      player.z,
      player.yaw,
      player.pitch,
      this.targets,
      now
    );

    if (result.eliminated) {
      player.score += 1;
      const participant = this.participants.get(player.playerId);
      if (participant) participant.score += 1;
    }
    client.send('shot', {
      accepted: true,
      hit: result.hit,
      eliminated: result.eliminated,
      targetId: result.targetId
    });
    this.sendPrivateState(client, player);
  }

  private simulate(deltaTimeMs: number): void {
    const deltaSeconds = clamp(deltaTimeMs / 1000, 0, 0.1);
    const now = Date.now();

    for (const [sessionId, player] of this.players) {
      if (player.health <= 0) {
        if (player.respawnAt > 0 && now >= player.respawnAt) {
          const spawn = findSpawnPosition(
            Array.from(this.players.values()).filter((candidate) => candidate !== player && candidate.health > 0)
          );
          if (!spawn) continue;

          player.health = 100;
          player.x = spawn.x;
          player.z = spawn.z;
          player.yaw = 0;
          player.pitch = -2.4;
          player.respawnAt = 0;
          player.moveX = 0;
          player.moveZ = 0;
          player.sprint = false;
          this.broadcast('player-respawned', { playerId: player.playerId });
        }
        continue;
      }

      const speed = player.sprint ? SPRINT_SPEED : WALK_SPEED;
      const deltaX = player.moveX * speed * deltaSeconds;
      const deltaZ = player.moveZ * speed * deltaSeconds;
      const nextX = player.x + deltaX;
      const nextZ = player.z + deltaZ;

      if (canOccupyPosition(nextX, player.z)) player.x = nextX;
      if (canOccupyPosition(player.x, nextZ)) player.z = nextZ;

      if (player.reloadEndsAt > 0 && now >= player.reloadEndsAt) {
        const loaded = Math.min(WEAPON_MAGAZINE_SIZE - player.ammo, player.reserve);
        player.ammo += loaded;
        player.reserve -= loaded;
        player.reloadEndsAt = 0;
        const client = this.clients.find((candidate) => candidate.sessionId === sessionId);
        if (client) this.sendPrivateState(client, player);
      }
    }

    updateTargetRespawns(this.targets, now);
    this.broadcastSnapshot();
  }

  private matchStatePayload(): Record<string, unknown> {
    return {
      phase: this.match.phase,
      startsAt: this.match.startsAt,
      endsAt: this.match.endsAt,
      remainingMs: getMatchRemainingMs(this.match, Date.now()),
      scoreLimit: DEFAULT_MATCH_CONFIG.scoreLimit,
      winnerUid: this.match.winnerUid,
      finishReason: this.match.finishReason
    };
  }

  private broadcastMatchState(): void {
    this.broadcast('match-state', this.matchStatePayload());
  }

  private getLeadingParticipantUid(): string | null {
    const ranked = [...this.participants.values()].sort((a, b) => b.score - a.score || b.kills - a.kills);
    if (ranked.length === 0) return null;
    if (ranked.length > 1 && ranked[0]!.score === ranked[1]!.score && ranked[0]!.kills === ranked[1]!.kills) return null;
    return ranked[0]!.uid;
  }

  private async endMatch(now: number, winnerUid: string | null, reason: 'score-limit' | 'time-limit'): Promise<void> {
    if (this.match.phase === 'finished') return;
    Object.assign(this.match, finishMatchLifecycle(this.match, now, winnerUid, reason));
    this.broadcastMatchState();
    this.broadcast('match-ended', { ...this.matchStatePayload(), winnerUid, reason });
    await this.persistFinalResult(this.match.finishedAt ?? now);
  }

  private async persistFinalResult(endedAt: number): Promise<void> {
    if (this.matchPersistenceStarted || this.participants.size === 0) return;
    this.matchPersistenceStarted = true;
    try {
      await persistMatchResult({
        matchId: this.roomId,
        mode: 'field-test-ffa',
        startedAt: this.match.createdAt,
        endedAt: Math.max(this.match.createdAt, endedAt),
        participants: Array.from(this.participants.values())
      });
    } catch (error) {
      this.matchPersistenceStarted = false;
      console.error('[TSI] Failed to persist authoritative match result:', error);
      throw error;
    }
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
