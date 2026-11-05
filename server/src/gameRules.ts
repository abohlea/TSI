export interface PlayerInput {
  sequence: number;
  moveX: number;
  moveZ: number;
  yaw: number;
}

export interface PlayerPosition {
  x: number;
  z: number;
  yaw: number;
}

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

export function parsePlayerInput(payload: unknown, lastSequence: number): PlayerInput | null {
  if (!isRecord(payload)) return null;
  const { sequence, moveX, moveZ, yaw } = payload;

  if (
    !finiteNumber(sequence) ||
    !Number.isSafeInteger(sequence) ||
    !finiteNumber(moveX) ||
    !finiteNumber(moveZ) ||
    !finiteNumber(yaw)
  ) return null;

  if (sequence <= lastSequence || Math.abs(yaw) > 3600) return null;

  if (Math.abs(moveX) > 1 || Math.abs(moveZ) > 1) return null;
  const magnitude = Math.hypot(moveX, moveZ);
  const safeScale = magnitude > 1 ? 1 / magnitude : 1;

  return {
    sequence,
    moveX: moveX * safeScale,
    moveZ: moveZ * safeScale,
    yaw: normalizeYaw(yaw)
  };
}

export function movePlayer(
  x: number,
  z: number,
  input: PlayerInput,
  deltaSeconds: number
): PlayerPosition {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);
  const radians = (input.yaw * Math.PI) / 180;
  const forwardX = Math.sin(radians);
  const forwardZ = -Math.cos(radians);
  const rightX = Math.cos(radians);
  const rightZ = Math.sin(radians);
  const speed = 7.2 * dt;

  const nextX = Math.max(-48, Math.min(48, x + (forwardX * input.moveZ + rightX * input.moveX) * speed));
  const nextZ = Math.max(-55, Math.min(55, z + (forwardZ * input.moveZ + rightZ * input.moveX) * speed));

  let resolvedX = x;
  let resolvedZ = z;
  if (!isBlocked(nextX, resolvedZ)) resolvedX = nextX;
  if (!isBlocked(resolvedX, nextZ)) resolvedZ = nextZ;

  return { x: resolvedX, z: resolvedZ, yaw: normalizeYaw(input.yaw) };
}
