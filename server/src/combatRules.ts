export interface PracticeTarget {
  id: number;
  x: number;
  z: number;
  health: number;
  active: boolean;
}

export interface PracticeShotResult {
  targetId: number | null;
  hit: boolean;
  eliminated: boolean;
}

export function resolvePracticeShot(
  originX: number,
  originZ: number,
  yawDegrees: number,
  targets: Iterable<PracticeTarget>,
  maxDistance = 70,
  maxLateralDistance = 1.05,
  damage = 34
): PracticeShotResult {
  if (![originX, originZ, yawDegrees, maxDistance, maxLateralDistance, damage].every(Number.isFinite)) {
    return { targetId: null, hit: false, eliminated: false };
  }
  if (maxDistance <= 0 || maxLateralDistance < 0 || damage <= 0) {
    return { targetId: null, hit: false, eliminated: false };
  }

  const radians = (yawDegrees * Math.PI) / 180;
  const forwardX = Math.sin(radians);
  const forwardZ = -Math.cos(radians);
  let nearest: PracticeTarget | null = null;
  let nearestDistance = maxDistance;

  for (const target of targets) {
    if (!target.active || ![target.x, target.z, target.health].every(Number.isFinite)) continue;
    const dx = target.x - originX;
    const dz = target.z - originZ;
    const along = dx * forwardX + dz * forwardZ;
    const lateral = Math.abs(dx * forwardZ - dz * forwardX);
    if (along > 0 && along < nearestDistance && lateral <= maxLateralDistance) {
      nearest = target;
      nearestDistance = along;
    }
  }

  if (!nearest) return { targetId: null, hit: false, eliminated: false };

  nearest.health = Math.max(0, nearest.health - damage);
  const eliminated = nearest.health === 0;
  if (eliminated) nearest.active = false;

  return { targetId: nearest.id, hit: true, eliminated };
}
