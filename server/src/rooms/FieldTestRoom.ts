import { Client, Room } from "colyseus";
import { FieldTestState, PlayerState, TargetState } from "../schema/FieldTestState.js";
import { movePlayer, parsePlayerInput, WORLD_BLOCKERS, type PlayerInput } from "../gameRules.js";
import {
  PLAYER_RESPAWN_SECONDS,
  resolveAuthoritativeHit,
  type CombatPlayer
} from "../combat.js";

interface SpawnPoint {
  x: number;
  z: number;
}

const PLAYER_SPAWNS: SpawnPoint[] = [
  { x: 0, z: 12 },
  { x: 3, z: 12 },
  { x: -3, z: 12 },
  { x: 0, z: 17 },
  { x: 6, z: 17 },
  { x: -6, z: 17 },
  { x: 9, z: 12 },
  { x: -9, z: 12 }
];

const TARGET_SPAWNS: SpawnPoint[] = [
  { x: -8, z: -20 },
  { x: 8, z: -25 },
  { x: 0, z: -45 },
  { x: 26, z: -18 }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class FieldTestRoom extends Room<FieldTestState> {
  maxClients = 8;
  patchRate = 50;
  maxMessagesPerSecond = 50;

  private readonly inputs = new Map<string, PlayerInput>();
  private readonly lastSequences = new Map<string, number>();
  private readonly lastShots = new Map<string, number>();
  private readonly reloadEnds = new Map<string, number>();
  private readonly targetRespawns = new Map<number, number>();
  private readonly playerRespawns = new Map<string, number>();

  onCreate(): void {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The TSI Field Test room is development-only.");
    }

    this.setState(new FieldTestState());
    TARGET_SPAWNS.forEach((spawn, index) => {
      const target = new TargetState();
      target.id = index + 1;
      target.x = spawn.x;
      target.z = spawn.z;
      target.health = 100;
      target.active = true;
      this.state.targets.set(String(target.id), target);
    });

    this.onMessage("input", (client, payload: unknown) => this.handleInput(client, payload));
    this.onMessage("fire", (client) => this.handleFire(client));
    this.onMessage("reload", (client) => this.handleReload(client));
    this.setSimulationInterval((deltaTime) => this.simulate(deltaTime), 50);
  }

  async onAuth(_client: Client, options: unknown): Promise<boolean> {
    if (process.env.NODE_ENV === "production") return false;
    const token = process.env.TSI_LOCAL_DEV_TOKEN;
    if (!token || token.length < 24 || !isRecord(options)) return false;
    return options.devToken === token;
  }

  onJoin(client: Client, options: unknown): void {
    const player = new PlayerState();
    const spawn = PLAYER_SPAWNS[(this.clients.length - 1) % PLAYER_SPAWNS.length];
    const requestedName = isRecord(options) && typeof options.displayName === "string"
      ? options.displayName
      : "OPERATOR";
    player.displayName = requestedName.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 16) || "OPERATOR";
    player.x = spawn.x;
    player.z = spawn.z;
    player.yaw = 0;
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { sequence: 0, moveX: 0, moveZ: 0, yaw: 0 });
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.lastSequences.delete(client.sessionId);
    this.lastShots.delete(client.sessionId);
    this.reloadEnds.delete(client.sessionId);
    this.playerRespawns.delete(client.sessionId);
  }

  private handleInput(client: Client, payload: unknown): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.health <= 0) return;
    const lastSequence = this.lastSequences.get(client.sessionId) ?? -1;
    const input = parsePlayerInput(payload, lastSequence);
    if (!input) return;
    this.lastSequences.set(client.sessionId, input.sequence);
    this.inputs.set(client.sessionId, input);
  }

  private handleFire(client: Client): void {
    const shooter = this.state.players.get(client.sessionId);
    if (!shooter || shooter.health <= 0 || shooter.ammo <= 0 || this.reloadEnds.has(client.sessionId)) return;

    const now = this.state.elapsedSeconds;
    const lastShot = this.lastShots.get(client.sessionId) ?? -10;
    if (now - lastShot < 0.135) return;
    this.lastShots.set(client.sessionId, now);
    shooter.ammo -= 1;

    const combatPlayers: CombatPlayer[] = [];
    this.state.players.forEach((candidate, sessionId) => {
      combatPlayers.push({
        sessionId,
        x: candidate.x,
        z: candidate.z,
        health: candidate.health,
        setHealth: (health) => { candidate.health = health; }
      });
    });

    const hit = resolveAuthoritativeHit(
      shooter.x,
      shooter.z,
      shooter.yaw,
      client.sessionId,
      Array.from(this.state.targets.values()),
      combatPlayers,
      WORLD_BLOCKERS
    );

    if (hit.kind === "target" && hit.eliminated) {
      shooter.eliminations += 1;
      this.targetRespawns.set(hit.targetId, now + 3.2);
    }

    if (hit.kind === "player") {
      const victim = this.state.players.get(hit.sessionId);
      if (victim && hit.eliminated) {
        shooter.eliminations += 1;
        victim.deaths += 1;
        this.playerRespawns.set(hit.sessionId, now + PLAYER_RESPAWN_SECONDS);
        this.reloadEnds.delete(hit.sessionId);

        const victimInput = this.inputs.get(hit.sessionId);
        if (victimInput) {
          this.inputs.set(hit.sessionId, {
            ...victimInput,
            moveX: 0,
            moveZ: 0
          });
        }
      }
    }

    if (hit.kind !== "miss") {
      this.broadcast("combat", {
        shooterSessionId: client.sessionId,
        hitType: hit.kind,
        targetId: hit.kind === "target" ? hit.targetId : null,
        victimSessionId: hit.kind === "player" ? hit.sessionId : null,
        eliminated: hit.eliminated
      });
    }
  }

  private handleReload(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.health <= 0 || player.ammo >= 30 || player.reserveAmmo <= 0 || this.reloadEnds.has(client.sessionId)) return;
    this.reloadEnds.set(client.sessionId, this.state.elapsedSeconds + 1.45);
  }

  private simulate(deltaMilliseconds: number): void {
    const deltaSeconds = Math.min(Math.max(deltaMilliseconds / 1000, 0), 0.1);
    this.state.elapsedSeconds += deltaSeconds;

    this.state.players.forEach((player, sessionId) => {
      if (player.health <= 0) {
        const respawnAt = this.playerRespawns.get(sessionId);
        if (respawnAt !== undefined && this.state.elapsedSeconds >= respawnAt) {
          const spawnIndex = Math.max(
            0,
            this.clients.findIndex((connected) => connected.sessionId === sessionId)
          );
          const spawn = PLAYER_SPAWNS[spawnIndex % PLAYER_SPAWNS.length]!;
          player.x = spawn.x;
          player.z = spawn.z;
          player.yaw = 0;
          player.health = 100;
          player.ammo = 30;
          player.reserveAmmo = 120;
          this.reloadEnds.delete(sessionId);
          this.playerRespawns.delete(sessionId);
          this.broadcast("player:respawn", { sessionId, x: player.x, z: player.z });
        }
        return;
      }

      const input = this.inputs.get(sessionId);
      if (input) {
        const next = movePlayer(player.x, player.z, input, deltaSeconds);
        player.x = next.x;
        player.z = next.z;
        player.yaw = next.yaw;
      }

      const reloadAt = this.reloadEnds.get(sessionId);
      if (reloadAt !== undefined && this.state.elapsedSeconds >= reloadAt) {
        const loaded = Math.min(30 - player.ammo, player.reserveAmmo);
        player.ammo += loaded;
        player.reserveAmmo -= loaded;
        this.reloadEnds.delete(sessionId);
      }
    });

    this.state.targets.forEach((target) => {
      const respawnAt = this.targetRespawns.get(target.id);
      if (respawnAt !== undefined && this.state.elapsedSeconds >= respawnAt) {
        target.health = 100;
        target.active = true;
        this.targetRespawns.delete(target.id);
      }
    });
  }
}
