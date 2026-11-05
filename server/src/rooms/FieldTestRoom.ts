import { Client, Room } from "colyseus";
import { FieldTestState, PlayerState, TargetState } from "../schema/FieldTestState.js";

interface PlayerInput {
  sequence: number;
  moveX: number;
  moveZ: number;
  yaw: number;
}

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

const BLOCKERS = [
  { minX: -30, maxX: -14, minZ: -31, maxZ: -13 },
  { minX: 12, maxX: 34, minZ: -44, maxZ: -28 },
  { minX: 35, maxX: 43, minZ: -2, maxZ: 6 },
  { minX: -12.5, maxX: -3.5, minZ: -15.7, maxZ: -14.3 },
  { minX: 8, maxX: 16, minZ: -29.7, maxZ: -28.3 },
  { minX: -15.8, maxX: -14.2, minZ: -6.1, maxZ: -3.9 },
  { minX: 15.8, maxX: 18.2, minZ: -9.2, maxZ: -6.8 },
  { minX: 6.9, maxX: 9.1, minZ: -43.1, maxZ: -40.9 }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeYaw(yaw: number): number {
  return ((yaw % 360) + 360) % 360;
}

function isBlocked(x: number, z: number): boolean {
  const radius = 0.42;
  return BLOCKERS.some((box) =>
    x + radius > box.minX && x - radius < box.maxX &&
    z + radius > box.minZ && z - radius < box.maxZ
  );
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
  }

  private handleInput(client: Client, payload: unknown): void {
    if (!isRecord(payload)) return;
    const { sequence, moveX, moveZ, yaw } = payload;
    if (
      !Number.isSafeInteger(sequence) ||
      !finiteNumber(moveX) ||
      !finiteNumber(moveZ) ||
      !finiteNumber(yaw)
    ) return;

    const last = this.lastSequences.get(client.sessionId) ?? -1;
    if ((sequence as number) <= last) return;

    const x = moveX as number;
    const z = moveZ as number;
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1.05 || Math.abs(yaw as number) > 3600) return;

    const safeScale = magnitude > 1 ? 1 / magnitude : 1;
    this.lastSequences.set(client.sessionId, sequence as number);
    this.inputs.set(client.sessionId, {
      sequence: sequence as number,
      moveX: x * safeScale,
      moveZ: z * safeScale,
      yaw: normalizeYaw(yaw as number)
    });
  }

  private handleFire(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.ammo <= 0 || this.reloadEnds.has(client.sessionId)) return;

    const now = this.state.elapsedSeconds;
    const lastShot = this.lastShots.get(client.sessionId) ?? -10;
    if (now - lastShot < 0.135) return;
    this.lastShots.set(client.sessionId, now);
    player.ammo -= 1;

    const radians = (player.yaw * Math.PI) / 180;
    const forwardX = Math.sin(radians);
    const forwardZ = -Math.cos(radians);
    let nearest: TargetState | null = null;
    let nearestDistance = 70;

    this.state.targets.forEach((target) => {
      if (!target.active) return;
      const dx = target.x - player.x;
      const dz = target.z - player.z;
      const along = dx * forwardX + dz * forwardZ;
      const miss = Math.abs(dx * forwardZ - dz * forwardX);
      if (along > 0 && along < nearestDistance && miss <= 1.05) {
        nearest = target;
        nearestDistance = along;
      }
    });

    if (nearest) {
      const target = nearest as TargetState;
      target.health = Math.max(0, target.health - 34);
      if (target.health === 0) {
        target.active = false;
        player.eliminations += 1;
        this.targetRespawns.set(target.id, now + 3.2);
      }
    }
  }

  private handleReload(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.ammo >= 30 || player.reserveAmmo <= 0 || this.reloadEnds.has(client.sessionId)) return;
    this.reloadEnds.set(client.sessionId, this.state.elapsedSeconds + 1.45);
  }

  private simulate(deltaMilliseconds: number): void {
    const deltaSeconds = Math.min(Math.max(deltaMilliseconds / 1000, 0), 0.1);
    this.state.elapsedSeconds += deltaSeconds;

    this.state.players.forEach((player, sessionId) => {
      const input = this.inputs.get(sessionId);
      if (input) {
        player.yaw = input.yaw;
        const radians = (player.yaw * Math.PI) / 180;
        const forwardX = Math.sin(radians);
        const forwardZ = -Math.cos(radians);
        const rightX = Math.cos(radians);
        const rightZ = Math.sin(radians);
        const speed = 7.2 * deltaSeconds;
        const nextX = Math.max(-48, Math.min(48, player.x + (forwardX * input.moveZ + rightX * input.moveX) * speed));
        const nextZ = Math.max(-55, Math.min(55, player.z + (forwardZ * input.moveZ + rightZ * input.moveX) * speed));
        let x = player.x;
        let z = player.z;
        if (!isBlocked(nextX, z)) x = nextX;
        if (!isBlocked(x, nextZ)) z = nextZ;
        player.x = x;
        player.z = z;
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
