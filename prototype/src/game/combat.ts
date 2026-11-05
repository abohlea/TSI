import * as pc from 'playcanvas';
import type { PracticeTarget } from './arena';

export interface ShotResult {
  hit: boolean;
  eliminated: boolean;
  target?: PracticeTarget;
}

/**
 * Deterministic practice-range hit test.
 * This is deliberately client-side and must NOT be reused as production
 * multiplayer authority. Public matches must validate shots on a dedicated server.
 */
export function resolvePracticeShot(
  origin: pc.Vec3,
  direction: pc.Vec3,
  targets: PracticeTarget[],
  damage = 34,
  maxDistance = 90
): ShotResult {
  let nearest: PracticeTarget | undefined;
  let nearestDistance = maxDistance;

  for (const target of targets) {
    if (!target.active || !target.entity.enabled) continue;
    const center = target.entity.getPosition().clone().add(new pc.Vec3(0, 1, 0));
    const toTarget = center.sub(origin);
    const projected = toTarget.dot(direction);
    if (projected < 0 || projected > maxDistance) continue;
    const closest = origin.clone().add(direction.clone().mulScalar(projected));
    const missDistance = closest.distance(center);
    if (missDistance <= target.radius && projected < nearestDistance) {
      nearest = target;
      nearestDistance = projected;
    }
  }

  if (!nearest) return { hit: false, eliminated: false };

  nearest.health = Math.max(0, nearest.health - damage);
  const eliminated = nearest.health === 0;
  if (eliminated) {
    nearest.active = false;
    nearest.entity.enabled = false;
    nearest.respawnAt = performance.now() + 4500;
  }

  return { hit: true, eliminated, target: nearest };
}
