import { clamp } from './types.js';

export interface WorldObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ServerTarget {
  targetId: string;
  x: number;
  z: number;
  health: number;
  active: boolean;
  respawnAt: number;
}

export interface ServerCombatant {
  sessionId: string;
  x: number;
  z: number;
  health: number;
  respawnAt: number;
}

export interface ShotResolution {
  hit: boolean;
  eliminated: boolean;
  targetId: string | null;
  playerSessionId: string | null;
}

export const WORLD_LIMIT = 48;
export const PLAYER_RADIUS = 0.58;
export const WALK_SPEED = 5.2;
export const SPRINT_SPEED = 8.2;
export const WEAPON_MAGAZINE_SIZE = 30;
export const WEAPON_STARTING_RESERVE = 90;
export const WEAPON_DAMAGE = 34;
export const WEAPON_COOLDOWN_MS = 120;
export const TARGET_RESPAWN_MS = 4500;
export const PLAYER_RESPAWN_MS = 4000;
export const PLAYER_HIT_RADIUS = 0.72;
export const SHOT_RANGE = 90;
const TARGET_RADIUS = 1.15;

const buildings = [
  { x: -20, z: -12, w: 12, d: 16 },
  { x: 20, z: -14, w: 13, d: 17 },
  { x: -25, z: -39, w: 17, d: 12 },
  { x: 26, z: -40, w: 16, d: 13 },
  { x: -37, z: -4, w: 8, d: 18 },
  { x: 37, z: -4, w: 8, d: 18 }
];

const obstacles: WorldObstacle[] = buildings.map(({ x, z, w, d }) => ({
  minX: x - w / 2 - 0.8,
  maxX: x + w / 2 + 0.8,
  minZ: z - d / 2 - 0.8,
  maxZ: z + d / 2 + 0.8
}));

for (let index = 0; index < 12; index += 1) {
  const x = (index % 2 === 0 ? -1 : 1) * (12 + Math.floor(index / 2) * 4.2);
  const z = -8 - Math.floor(index / 2) * 7.2;
  obstacles.push({
    minX: x - 1.35,
    maxX: x + 1.35,
    minZ: z - 0.95,
    maxZ: z + 0.95
  });
}

export const WORLD_OBSTACLES: readonly WorldObstacle[] = obstacles;

export function createPracticeTargets(): ServerTarget[] {
  const positions = [
    [-5, -22], [0, -29], [5, -22],
    [-13, -37], [13, -37], [0, -48]
  ] as const;

  return positions.map(([x, z], index) => ({
    targetId: `target-${index + 1}`,
    x,
    z,
    health: 100,
    active: true,
    respawnAt: 0
  }));
}

export function canOccupyPosition(x: number, z: number): boolean {
  if (x < -WORLD_LIMIT || x > WORLD_LIMIT || z < -WORLD_LIMIT || z > WORLD_LIMIT) {
    return false;
  }

  return !WORLD_OBSTACLES.some((obstacle) =>
    x > obstacle.minX - PLAYER_RADIUS &&
    x < obstacle.maxX + PLAYER_RADIUS &&
    z > obstacle.minZ - PLAYER_RADIUS &&
    z < obstacle.maxZ + PLAYER_RADIUS
  );
}

function rayIntersectsObstacle(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  obstacle: WorldObstacle,
  maxDistance: number
): boolean {
  let near = 0;
  let far = maxDistance;

  for (const [origin, direction, min, max] of [
    [originX, dirX, obstacle.minX, obstacle.maxX],
    [originZ, dirZ, obstacle.minZ, obstacle.maxZ]
  ] as const) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < min || origin > max) return false;
      continue;
    }

    const first = (min - origin) / direction;
    const second = (max - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }

  return far >= 0 && near <= maxDistance;
}

function raySphereDistance(
  originX: number,
  originY: number,
  originZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number
): number | null {
  const toX = centerX - originX;
  const toY = centerY - originY;
  const toZ = centerZ - originZ;
  const projection = toX * dirX + toY * dirY + toZ * dirZ;
  if (projection < 0) return null;

  const perpendicularSq = toX * toX + toY * toY + toZ * toZ - projection * projection;
  const radiusSq = radius * radius;
  if (perpendicularSq > radiusSq) return null;

  const halfChord = Math.sqrt(Math.max(0, radiusSq - perpendicularSq));
  const distance = Math.max(0, projection - halfChord);
  return distance <= SHOT_RANGE ? distance : null;
}

export function resolveAuthoritativeShot(
  originX: number,
  originY: number,
  originZ: number,
  yawDegrees: number,
  pitchDegrees: number,
  targets: ServerTarget[],
  now: number,
  shooterSessionId: string | null = null,
  players: ServerCombatant[] = []
): ShotResolution {
  const yaw = yawDegrees * Math.PI / 180;
  const pitch = pitchDegrees * Math.PI / 180;
  const horizontal = Math.cos(pitch);
  const dirX = -Math.sin(yaw) * horizontal;
  const dirY = Math.sin(pitch);
  const dirZ = -Math.cos(yaw) * horizontal;

  let nearestTarget: ServerTarget | null = null;
  let nearestPlayer: ServerCombatant | null = null;
  let nearestDistance = SHOT_RANGE;

  // Practice targets and players compete for the same nearest visible impact.
  // The client never supplies a target ID or a damage value.
  for (const target of targets) {
    if (!target.active) continue;
    const distance = raySphereDistance(
      originX, originY, originZ,
      dirX, dirY, dirZ,
      target.x, 1.08, target.z,
      TARGET_RADIUS
    );

    if (distance === null || distance >= nearestDistance) continue;
    const blocked = WORLD_OBSTACLES.some((obstacle) =>
      rayIntersectsObstacle(originX, originZ, dirX, dirZ, obstacle, distance)
    );
    if (blocked) continue;

    nearestTarget = target;
    nearestPlayer = null;
    nearestDistance = distance;
  }

  for (const candidate of players) {
    if (
      candidate.sessionId === shooterSessionId ||
      candidate.health <= 0
    ) continue;

    const distance = raySphereDistance(
      originX, originY, originZ,
      dirX, dirY, dirZ,
      candidate.x, 1.15, candidate.z,
      PLAYER_HIT_RADIUS
    );

    if (distance === null || distance >= nearestDistance) continue;
    const blocked = WORLD_OBSTACLES.some((obstacle) =>
      rayIntersectsObstacle(originX, originZ, dirX, dirZ, obstacle, distance)
    );
    if (blocked) continue;

    nearestTarget = null;
    nearestPlayer = candidate;
    nearestDistance = distance;
  }

  if (nearestPlayer) {
    nearestPlayer.health = clamp(nearestPlayer.health - WEAPON_DAMAGE, 0, 100);
    const eliminated = nearestPlayer.health === 0;
    if (eliminated) nearestPlayer.respawnAt = now + PLAYER_RESPAWN_MS;

    return {
      hit: true,
      eliminated,
      targetId: null,
      playerSessionId: nearestPlayer.sessionId
    };
  }

  if (!nearestTarget) {
    return { hit: false, eliminated: false, targetId: null, playerSessionId: null };
  }

  nearestTarget.health = clamp(nearestTarget.health - WEAPON_DAMAGE, 0, 100);
  const eliminated = nearestTarget.health === 0;
  if (eliminated) {
    nearestTarget.active = false;
    nearestTarget.respawnAt = now + TARGET_RESPAWN_MS;
  }

  return {
    hit: true,
    eliminated,
    targetId: nearestTarget.targetId,
    playerSessionId: null
  };
}

export function updatePlayerRespawns<T extends ServerCombatant>(players: T[], now: number): T[] {
  const respawned: T[] = [];

  for (const player of players) {
    if (player.health > 0 || player.respawnAt <= 0 || now < player.respawnAt) continue;
    player.health = 100;
    player.respawnAt = 0;
    respawned.push(player);
  }

  return respawned;
}

export function updateTargetRespawns(targets: ServerTarget[], now: number): void {
  for (const target of targets) {
    if (target.active || target.respawnAt <= 0 || now < target.respawnAt) continue;
    target.active = true;
    target.health = 100;
    target.respawnAt = 0;
  }
}
