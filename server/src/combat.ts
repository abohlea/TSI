export interface CombatTarget {
  id: number;
  x: number;
  z: number;
  health: number;
  active: boolean;
}

export interface CombatPlayer {
  sessionId: string;
  x: number;
  z: number;
  health: number;
  setHealth?(health: number): void;
}

export interface CombatBlocker {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type AuthoritativeHit =
  | { kind: "miss" }
  | { kind: "target"; targetId: number; eliminated: boolean }
  | { kind: "player"; sessionId: string; eliminated: boolean };

export const PLAYER_DAMAGE = 34;
export const PLAYER_RESPAWN_SECONDS = 4;
export const PLAYER_HIT_RADIUS = 0.78;
export const TARGET_HIT_RADIUS = 1.05;
export const MAX_SHOT_RANGE = 70;

function rayCircleDistance(
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  centerX: number,
  centerZ: number,
  radius: number
): number | null {
  const toX = centerX - originX;
  const toZ = centerZ - originZ;
  const along = toX * directionX + toZ * directionZ;
  if (along <= 0) return null;

  const closestX = originX + directionX * along;
  const closestZ = originZ + directionZ * along;
  const missSquared = (centerX - closestX) ** 2 + (centerZ - closestZ) ** 2;
  const radiusSquared = radius * radius;
  if (missSquared > radiusSquared) return null;

  const entry = along - Math.sqrt(Math.max(0, radiusSquared - missSquared));
  return entry > 0 ? entry : along;
}

function rayHitsBlocker(
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  blocker: CombatBlocker,
  maxDistance: number
): boolean {
  let near = 0;
  let far = maxDistance;

  const axes: Array<[number, number, number, number]> = [
    [originX, directionX, blocker.minX, blocker.maxX],
    [originZ, directionZ, blocker.minZ, blocker.maxZ]
  ];

  for (const [origin, direction, minimum, maximum] of axes) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }

    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }

  return far >= 0 && near < maxDistance;
}

/**
 * Resolves one server-owned hitscan shot. The client supplies neither a
 * victim ID nor a damage amount; candidates are selected from authoritative
 * room state and the nearest unobstructed impact wins.
 */
export function resolveAuthoritativeHit(
  originX: number,
  originZ: number,
  yawDegrees: number,
  shooterSessionId: string,
  targets: CombatTarget[],
  players: CombatPlayer[],
  blockers: readonly CombatBlocker[]
): AuthoritativeHit {
  const yaw = yawDegrees * Math.PI / 180;
  const directionX = Math.sin(yaw);
  const directionZ = -Math.cos(yaw);
  let nearestDistance = MAX_SHOT_RANGE;
  let nearestTarget: CombatTarget | null = null;
  let nearestPlayer: CombatPlayer | null = null;

  for (const target of targets) {
    if (!target.active || target.health <= 0) continue;
    const distance = rayCircleDistance(
      originX, originZ, directionX, directionZ,
      target.x, target.z, TARGET_HIT_RADIUS
    );
    if (distance === null || distance >= nearestDistance) continue;
    const blocked = blockers.some((blocker) =>
      rayHitsBlocker(originX, originZ, directionX, directionZ, blocker, distance)
    );
    if (blocked) continue;

    nearestDistance = distance;
    nearestTarget = target;
    nearestPlayer = null;
  }

  for (const player of players) {
    if (player.sessionId === shooterSessionId || player.health <= 0) continue;
    const distance = rayCircleDistance(
      originX, originZ, directionX, directionZ,
      player.x, player.z, PLAYER_HIT_RADIUS
    );
    if (distance === null || distance >= nearestDistance) continue;
    const blocked = blockers.some((blocker) =>
      rayHitsBlocker(originX, originZ, directionX, directionZ, blocker, distance)
    );
    if (blocked) continue;

    nearestDistance = distance;
    nearestPlayer = player;
    nearestTarget = null;
  }

  if (nearestPlayer) {
    nearestPlayer.health = Math.max(0, nearestPlayer.health - PLAYER_DAMAGE);
    nearestPlayer.setHealth?.(nearestPlayer.health);
    return {
      kind: "player",
      sessionId: nearestPlayer.sessionId,
      eliminated: nearestPlayer.health === 0
    };
  }

  if (nearestTarget) {
    nearestTarget.health = Math.max(0, nearestTarget.health - PLAYER_DAMAGE);
    const eliminated = nearestTarget.health === 0;
    if (eliminated) nearestTarget.active = false;
    return { kind: "target", targetId: nearestTarget.id, eliminated };
  }

  return { kind: "miss" };
}
