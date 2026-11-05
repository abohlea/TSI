import { clamp, isFiniteNumber, isRecord, type PlayerInput } from './types.js';

const MAX_INPUT_STEP = 120;

export function parsePlayerInput(payload: unknown, lastSequence: number): PlayerInput | null {
  if (!isRecord(payload)) return null;

  const { sequence, moveX, moveZ, yaw, pitch, sprint, shoot } = payload;
  if (
    !isFiniteNumber(sequence) ||
    !Number.isSafeInteger(sequence) ||
    sequence <= lastSequence ||
    sequence - lastSequence > MAX_INPUT_STEP ||
    !isFiniteNumber(moveX) ||
    !isFiniteNumber(moveZ) ||
    !isFiniteNumber(yaw) ||
    !isFiniteNumber(pitch) ||
    pitch < -45 ||
    pitch > 45 ||
    typeof sprint !== 'boolean' ||
    typeof shoot !== 'boolean'
  ) {
    return null;
  }

  const clampedX = clamp(moveX, -1, 1);
  const clampedZ = clamp(moveZ, -1, 1);
  const magnitude = Math.hypot(clampedX, clampedZ);
  const factor = magnitude > 1 ? 1 / magnitude : 1;

  return {
    sequence,
    moveX: clampedX * factor,
    moveZ: clampedZ * factor,
    yaw: ((yaw % 360) + 360) % 360,
    pitch,
    sprint,
    shoot
  };
}
