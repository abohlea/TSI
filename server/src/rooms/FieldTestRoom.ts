import { Client, Room } from "colyseus";
import { FieldTestState, PlayerState, TargetState } from "../schema/FieldTestState.js";
import { movePlayer, parsePlayerInput, type PlayerInput } from "../gameRules.js";
import { resolvePracticeShot } from "../combatRules.js";
import {
  authenticateFirebasePlayer,
  parseRoomAuthOptions,
  type AuthenticatedPlayer
} from "../firebase/adminAuth.js";

interface SpawnPoint {
  x: number;
  z: number;
}

interface PrivatePlayerState {
  ammo: number;
  reserveAmmo: number;
  eliminations: number;
  shots: number;
  hits: number;
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

export class FieldTestRoom extends Room<FieldTestState> {
  maxClients = 8;
  patchRate = 50;
  maxMessagesPerSecond = 50;

  private readonly inputs = new Map<string, PlayerInput>();
  private readonly lastSequences = new Map<string, number>();
  private readonly lastShots = new Map<string, number>();
  private readonly reloadEnds = new Map<string, number>();
  private readonly privatePlayers = new Map<string, PrivatePlayerState>();
  private readonly targetRespawns = new Map<number, number>();
  private readonly authenticatedPlayers = new Map<string, AuthenticatedPlayer>();

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

  async onAuth(client: Client, options: unknown): Promise<boolean> {
    if (process.env.NODE_ENV === "production") return false;
    const parsed = parseRoomAuthOptions(options);
    if (!parsed) return false;

    try {
      const identity = await authenticateFirebasePlayer(parsed.idToken, parsed.displayName);
      this.authenticatedPlayers.set(client.sessionId, identity);
      return true;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "authentication-failed";
      console.warn(`[TSI] Firebase room authentication rejected: ${code}`);
      return false;
    }
  }

  onJoin(client: Client, options: unknown): void {
    const identity = this.authenticatedPlayers.get(client.sessionId);
    this.authenticatedPlayers.delete(client.sessionId);
    if (!identity) {
      throw new Error("A verified Firebase identity is required to join the TSI room.");
    }

    const player = new PlayerState();
    const spawn = PLAYER_SPAWNS[(this.clients.length - 1) % PLAYER_SPAWNS.length];
    const requestedName = typeof options === "object" && options !== null &&
      typeof (options as Record<string, unknown>).displayName === "string"
      ? String((options as Record<string, unknown>).displayName)
      : "OPERATOR";
    player.displayName = identity.displayName || requestedName.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 16) || "OPERATOR";
    player.x = spawn.x;
    player.z = spawn.z;
    player.yaw = 0;
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { sequence: 0, moveX: 0, moveZ: 0, yaw: 0 });
    this.privatePlayers.set(client.sessionId, { ammo: 30, reserveAmmo: 120, eliminations: 0, shots: 0, hits: 0 });
    this.sendPrivateState(client);
  }

  onLeave(client: Client): void {
    this.authenticatedPlayers.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.lastSequences.delete(client.sessionId);
    this.lastShots.delete(client.sessionId);
    this.reloadEnds.delete(client.sessionId);
    this.privatePlayers.delete(client.sessionId);
  }

  private sendPrivateState(client: Client): void {
    const values = this.privatePlayers.get(client.sessionId);
    if (!values) return;
    client.send("private", {
      ammo: values.ammo,
      reserveAmmo: values.reserveAmmo,
      eliminations: values.eliminations,
      shots: values.shots,
      hits: values.hits,
      reloading: this.reloadEnds.has(client.sessionId)
    });
  }

  private handleInput(client: Client, payload: unknown): void {
    const lastSequence = this.lastSequences.get(client.sessionId) ?? -1;
    const input = parsePlayerInput(payload, lastSequence);
    if (!input) return;
    this.lastSequences.set(client.sessionId, input.sequence);
    this.inputs.set(client.sessionId, input);
  }

  private handleFire(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const privateState = this.privatePlayers.get(client.sessionId);
    if (!player || !privateState || privateState.ammo <= 0 || this.reloadEnds.has(client.sessionId)) return;

    const now = this.state.elapsedSeconds;
    const lastShot = this.lastShots.get(client.sessionId) ?? -10;
    if (now - lastShot < 0.135) return;
    this.lastShots.set(client.sessionId, now);
    privateState.ammo -= 1;
    privateState.shots += 1;

    const shot = resolvePracticeShot(
      player.x,
      player.z,
      player.yaw,
      Array.from(this.state.targets.values())
    );
    if (shot.hit) {
      privateState.hits += 1;
      if (shot.eliminated) privateState.eliminations += 1;
      const target = this.state.targets.get(String(shot.targetId));
      if (target && shot.eliminated) this.targetRespawns.set(target.id, now + 3.2);
    }

    this.sendPrivateState(client);
  }

  private handleReload(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const privateState = this.privatePlayers.get(client.sessionId);
    if (!player || !privateState || privateState.ammo >= 30 || privateState.reserveAmmo <= 0 || this.reloadEnds.has(client.sessionId)) return;
    this.reloadEnds.set(client.sessionId, this.state.elapsedSeconds + 1.45);
    this.sendPrivateState(client);
  }

  private simulate(deltaMilliseconds: number): void {
    const deltaSeconds = Math.min(Math.max(deltaMilliseconds / 1000, 0), 0.1);
    this.state.elapsedSeconds += deltaSeconds;

    this.state.players.forEach((player, sessionId) => {
      const input = this.inputs.get(sessionId);
      if (input) {
        const next = movePlayer(player.x, player.z, input, deltaSeconds);
        player.x = next.x;
        player.z = next.z;
        player.yaw = next.yaw;
      }

      const reloadAt = this.reloadEnds.get(sessionId);
      if (reloadAt !== undefined && this.state.elapsedSeconds >= reloadAt) {
        const privateState = this.privatePlayers.get(sessionId);
        if (privateState) {
          const loaded = Math.min(30 - privateState.ammo, privateState.reserveAmmo);
          privateState.ammo += loaded;
          privateState.reserveAmmo -= loaded;
          const owner = this.clients.find((candidate) => candidate.sessionId === sessionId);
          if (owner) this.sendPrivateState(owner);
        }
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
