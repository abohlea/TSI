import { randomUUID } from 'node:crypto';
import { Client, Room } from 'colyseus';
import { clamp, isRecord } from '../types.js';
import { parsePlayerInput } from '../validation.js';
import { consumeSessionTicket } from '../sessionTickets.js';
import { persistMatchResult, type MatchParticipantResult } from '../matchResults.js';
import { saveMatchCheckpoint } from '../matchJournal.js';
import {
  advanceTeamMatch,
  assignBalancedTeam,
  createTeamMatch,
  recordTeamElimination,
  type TeamId,
  type TeamMatchState
} from '../teamRounds.js';
import {
  canOccupyPosition,
  findSpawnPosition,
  resolveAuthoritativePlayerShot,
  SPRINT_SPEED,
  WALK_SPEED,
  WEAPON_COOLDOWN_MS,
  WEAPON_MAGAZINE_SIZE,
  WEAPON_STARTING_RESERVE
} from '../world.js';

interface AuthData { playerId: string; persistent: boolean }
interface TeamPlayer {
  playerId: string;
  team: TeamId;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  ammo: number;
  reserve: number;
  score: number;
  lastSequence: number;
  moveX: number;
  moveZ: number;
  sprint: boolean;
  nextShotAt: number;
  respawnAt: number;
  connected: boolean;
}
interface Participant extends MatchParticipantResult { team: TeamId }

const STEP_MS = 50;
const ROUND_RESPAWN_MS = 2500;
const RELOAD_MS = 1350;

export class TeamMatchRoom extends Room {
  override maxClients = 10;
  override maxMessagesPerSecond = 35;
  override patchRate = 50;

  private readonly players = new Map<string, TeamPlayer>();
  private readonly teams = new Map<string, TeamId>();
  private readonly participants = new Map<string, Participant>();
  private match: TeamMatchState = createTeamMatch(Date.now());
  private readonly matchStartedAt = Date.now();
  private readonly reloadEnds = new Map<string, number>();
  private persistenceStarted = false;
  private persistencePromise: Promise<void> | null = null;
  private checkpointQueue: Promise<void> = Promise.resolve();
  private lastClockBroadcastAt = 0;

  override onCreate(): void {
    this.setMetadata({ mode: 'team-rounds-5v5', build: '0.4.0' });
    this.onMessage('input', (client, payload: unknown) => this.handleInput(client, payload));
    this.onMessage('fire', (client) => this.handleFire(client));
    this.onMessage('reload', (client) => this.handleReload(client));
    this.setTimestep((deltaMs) => this.simulate(deltaMs), STEP_MS);
    this.broadcastMatchState();
  }

  override async onAuth(_client: Client, options: unknown): Promise<AuthData> {
    if (isRecord(options) && typeof options.sessionTicket === 'string') {
      return { ...consumeSessionTicket(options.sessionTicket), persistent: true };
    }
    if (process.env.NODE_ENV === 'production') throw new Error('A short-lived game session ticket is required.');
    if (process.env.TSI_ENABLE_LOCAL_AUTH !== 'true') throw new Error('Local room authentication is not enabled.');
    const expected = process.env.TSI_LOCAL_DEV_TOKEN ?? '';
    if (!expected || expected.length < 24 || !isRecord(options) ||
        typeof options.devToken !== 'string' || options.devToken !== expected) {
      throw new Error('Invalid local development token.');
    }
    return { playerId: randomUUID(), persistent: false };
  }

  override onJoin(client: Client, _options: unknown, auth: AuthData): void {
    if (this.match.phase === 'finished') throw new Error('This match has finished.');
    const alpha = [...this.teams.values()].filter((team) => team === 'alpha').length;
    const bravo = [...this.teams.values()].filter((team) => team === 'bravo').length;
    const team = assignBalancedTeam(alpha, bravo);
    const spawn = findSpawnPosition([...this.players.values()].filter((player) => player.health > 0));
    if (!spawn) throw new Error('No free player spawn position is available.');

    const player: TeamPlayer = {
      playerId: auth.playerId, team, x: spawn.x, z: spawn.z, yaw: team === 'alpha' ? 0 : 180,
      pitch: -2.4, health: 100, ammo: WEAPON_MAGAZINE_SIZE, reserve: WEAPON_STARTING_RESERVE,
      score: 0, lastSequence: 0, moveX: 0, moveZ: 0, sprint: false, nextShotAt: 0, respawnAt: 0,
      connected: true
    };
    this.players.set(client.sessionId, player);
    this.teams.set(client.sessionId, team);
    if (auth.persistent && !this.participants.has(auth.playerId)) {
      this.participants.set(auth.playerId, {
        uid: auth.playerId, team, score: 0, kills: 0, deaths: 0, joinedAt: Date.now()
      });
    }
    this.clock.setTimeout(() => {
      if (!this.players.has(client.sessionId)) return;
      client.send('team-welcome', { playerId: player.playerId, team, roomId: this.roomId, x: player.x, z: player.z });
      client.send('team-match-state', this.matchPayload());
      this.broadcastPlayers();
      this.broadcastMatchState();
      this.sendPrivate(client, player);
    }, 25);
    this.queueCheckpoint();
  }

  override onDrop(client: Client, _code?: number): void {
    const player = this.players.get(client.sessionId);
    if (!player) return;
    if (this.match.phase === 'finished') {
      this.removePlayer(client.sessionId);
      return;
    }

    // Keep the seat, team and authoritative player state for a short network
    // interruption. A timed-out reconnection is finalized by onLeave().
    player.connected = false;
    player.moveX = 0;
    player.moveZ = 0;
    player.sprint = false;
    this.broadcastPlayers();
    this.allowReconnection(client, 25);
  }

  override onReconnect(client: Client): void {
    const player = this.players.get(client.sessionId);
    if (!player) return;
    player.connected = true;
    player.moveX = 0;
    player.moveZ = 0;
    player.sprint = false;
    client.send('team-welcome', {
      playerId: player.playerId, team: player.team, roomId: this.roomId, x: player.x, z: player.z
    });
    client.send('team-match-state', this.matchPayload());
    this.sendPrivate(client, player);
    this.broadcastPlayers();
  }

  override onLeave(client: Client, _code?: number): void {
    this.removePlayer(client.sessionId);
  }

  private removePlayer(sessionId: string): void {
    this.players.delete(sessionId);
    this.teams.delete(sessionId);
    this.reloadEnds.delete(sessionId);
    this.broadcastPlayers();
  }

  override async onDispose(): Promise<void> {
    if (this.match.phase === 'finished') await this.persistResult();
  }

  private handleInput(client: Client, payload: unknown): void {
    const player = this.players.get(client.sessionId);
    if (!player || this.match.phase !== 'active' || player.health <= 0) return;
    const input = parsePlayerInput(payload, player.lastSequence);
    if (!input) return;
    player.lastSequence = input.sequence;
    player.moveX = input.moveX;
    player.moveZ = input.moveZ;
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    player.sprint = input.sprint;
    if (input.shoot) this.handleFire(client);
  }

  private handleFire(client: Client): void {
    const shooter = this.players.get(client.sessionId);
    if (!shooter || this.match.phase !== 'active' || shooter.health <= 0 ||
        shooter.ammo <= 0 || this.reloadEnds.has(client.sessionId)) return;
    const now = Date.now();
    if (now < shooter.nextShotAt) return;
    shooter.nextShotAt = now + WEAPON_COOLDOWN_MS;
    shooter.ammo -= 1;

    const opponents = [...this.players.values()].filter((candidate) => candidate.team !== shooter.team);
    const result = resolveAuthoritativePlayerShot(
      shooter.playerId, shooter.x, 1.55, shooter.z, shooter.yaw, shooter.pitch, opponents
    );
    if (result.hit && result.targetPlayerId) {
      const victim = opponents.find((candidate) => candidate.playerId === result.targetPlayerId);
      if (victim && result.eliminated) {
        victim.respawnAt = now + ROUND_RESPAWN_MS;
        victim.moveX = 0; victim.moveZ = 0; victim.sprint = false;
        shooter.score += 1;
        const killerStats = this.participants.get(shooter.playerId);
        if (killerStats) { killerStats.kills += 1; killerStats.score += 1; }
        const victimStats = this.participants.get(victim.playerId);
        if (victimStats) victimStats.deaths += 1;
        this.match = recordTeamElimination(this.match, shooter.team, now);
        this.broadcast('player-eliminated', {
          killerId: shooter.playerId, playerId: victim.playerId, team: shooter.team,
          respawnAt: victim.respawnAt
        });
        this.advanceAndBroadcast(now);
        this.queueCheckpoint();
      }
    }
    client.send('team-shot', { accepted: true, hit: result.hit, eliminated: result.eliminated });
    this.sendPrivate(client, shooter);
    this.broadcastPlayers();
  }

  private handleReload(client: Client): void {
    const player = this.players.get(client.sessionId);
    if (!player || this.match.phase !== 'active' || player.health <= 0 ||
        player.ammo >= WEAPON_MAGAZINE_SIZE || player.reserve <= 0 || this.reloadEnds.has(client.sessionId)) return;
    this.reloadEnds.set(client.sessionId, Date.now() + RELOAD_MS);
    client.send('team-reload', { reloading: true, endsAt: this.reloadEnds.get(client.sessionId) });
  }

  private simulate(deltaMs: number): void {
    const now = Date.now();
    if (this.match.phase === 'active') {
      const dt = clamp(deltaMs / 1000, 0, 0.1);
      for (const [sessionId, player] of this.players) {
        if (player.health <= 0) {
          if (player.respawnAt > 0 && now >= player.respawnAt) this.respawn(player);
          continue;
        }
        const speed = player.sprint ? SPRINT_SPEED : WALK_SPEED;
        const nextX = player.x + player.moveX * speed * dt;
        const nextZ = player.z + player.moveZ * speed * dt;
        if (canOccupyPosition(nextX, player.z)) player.x = nextX;
        if (canOccupyPosition(player.x, nextZ)) player.z = nextZ;
        const reloadAt = this.reloadEnds.get(sessionId);
        if (reloadAt !== undefined && now >= reloadAt) {
          const loaded = Math.min(WEAPON_MAGAZINE_SIZE - player.ammo, player.reserve);
          player.ammo += loaded; player.reserve -= loaded;
          this.reloadEnds.delete(sessionId);
          const owner = this.clients.find((candidate) => candidate.sessionId === sessionId);
          if (owner) this.sendPrivate(owner, player);
        }
      }
    }
    this.advanceAndBroadcast(now);
    if (now - this.lastClockBroadcastAt >= 1000) {
      this.lastClockBroadcastAt = now;
      this.broadcastMatchState();
    }
    this.broadcastPlayers();
  }

  private respawn(player: TeamPlayer): void {
    const spawn = findSpawnPosition([...this.players.values()].filter((candidate) => candidate !== player && candidate.health > 0));
    if (!spawn) return;
    player.x = spawn.x; player.z = spawn.z; player.yaw = player.team === 'alpha' ? 0 : 180;
    player.pitch = -2.4; player.health = 100; player.ammo = WEAPON_MAGAZINE_SIZE;
    player.respawnAt = 0; player.moveX = 0; player.moveZ = 0; player.sprint = false;
    const owner = [...this.players.entries()].find(([, candidate]) => candidate === player);
    if (owner) {
      const client = this.clients.find((candidate) => candidate.sessionId === owner[0]);
      if (client) this.sendPrivate(client, player);
    }
    this.broadcast('player-respawned', { playerId: player.playerId, team: player.team });
  }

  private advanceAndBroadcast(now: number): void {
    const previous = this.match;
    this.match = advanceTeamMatch(this.match, now);
    if (this.match !== previous) {
      if (this.match.phase === 'active' && previous.phase === 'intermission') this.resetRound();
      this.broadcastMatchState();
      this.queueCheckpoint();
      if (this.match.phase === 'finished') {
        this.broadcast('team-match-ended', this.matchPayload());
        void this.persistResult();
      }
    }
  }

  private resetRound(): void {
    const occupied: Array<{ x: number; z: number }> = [];
    for (const player of this.players.values()) {
      const spawn = findSpawnPosition(occupied);
      if (spawn) {
        player.x = spawn.x; player.z = spawn.z; occupied.push(spawn);
      }
      player.health = 100; player.ammo = WEAPON_MAGAZINE_SIZE; player.reserve = WEAPON_STARTING_RESERVE;
      player.respawnAt = 0; player.moveX = 0; player.moveZ = 0; player.sprint = false;
      player.score = 0;
      this.reloadEnds.delete([...this.players.entries()].find(([, candidate]) => candidate === player)?.[0] ?? '');
    }
    this.broadcast('round-reset', { round: this.match.round });
    this.broadcastPlayers();
  }

  private matchPayload(): Record<string, unknown> {
    return {
      mode: 'teams-5v5', phase: this.match.phase, round: this.match.round,
      roundWins: this.match.roundWins, roundScore: this.match.roundScore,
      matchScore: this.match.matchScore, roundStartedAt: this.match.roundStartedAt,
      roundEndsAt: this.match.roundEndsAt, intermissionEndsAt: this.match.intermissionEndsAt,
      remainingMs: this.match.phase === 'active'
        ? Math.max(0, this.match.roundEndsAt - Date.now())
        : this.match.phase === 'intermission'
          ? Math.max(0, (this.match.intermissionEndsAt ?? Date.now()) - Date.now()) : 0,
      winner: this.match.winner, finishReason: this.match.finishReason,
      scoreLimit: 5, roundDurationMs: 180000, intermissionMs: 8000
    };
  }

  private broadcastMatchState(): void {
    this.broadcast('team-match-state', this.matchPayload());
  }

  private broadcastPlayers(): void {
    this.broadcast('team-players', [...this.players.values()].map((player) => ({
      playerId: player.playerId, team: player.team, x: player.x, z: player.z,
      yaw: player.yaw, health: player.health, score: player.score, connected: player.connected
    })));
  }

  private sendPrivate(client: Client, player: TeamPlayer): void {
    client.send('team-self', { ammo: player.ammo, reserve: player.reserve, score: player.score });
  }


  private queueCheckpoint(): void {
    if (this.participants.size === 0) return;
    const checkpoint = {
      matchId: this.roomId,
      mode: 'field-test-teams' as const,
      startedAt: this.matchStartedAt,
      participants: [...this.participants.values()].map((participant) => ({ ...participant })),
      teamWins: { ...this.match.roundWins },
      winnerTeam: this.match.phase === 'finished' ? this.match.winner : null
    };
    this.checkpointQueue = this.checkpointQueue
      .then(() => saveMatchCheckpoint(checkpoint))
      .catch((error) => {
        console.error('[TSI] Failed to checkpoint team match:', error);
      });
  }

  private persistResult(): Promise<void> {
    if (this.persistencePromise) return this.persistencePromise;
    if (this.participants.size === 0 || this.match.phase !== 'finished') return Promise.resolve();
    this.persistenceStarted = true;
    this.persistencePromise = (async () => {
      try {
        await this.checkpointQueue;
        await persistMatchResult({
          matchId: this.roomId, mode: 'field-test-teams', startedAt: this.matchStartedAt,
          endedAt: Date.now(), participants: [...this.participants.values()],
          winnerTeam: this.match.winner, teamWins: this.match.roundWins
        });
        const { getFirestore } = await import('firebase-admin/firestore');
        const { getFirebaseAdminApp } = await import('../firebaseAuth.js');
        await getFirestore(getFirebaseAdminApp()).doc('activeMatchCheckpoints/' + this.roomId).delete();
      } catch (error) {
        this.persistenceStarted = false;
        this.persistencePromise = null;
        console.error('[TSI] Failed to persist team match result:', error);
      }
    })();
    return this.persistencePromise;
  }
}
