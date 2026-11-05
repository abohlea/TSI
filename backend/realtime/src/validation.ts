import { clamp, isFiniteNumber, isRecord, type PlayerInput } from './types.js';

const MAX_INPUT_STEP = 120;

/**
 * Parses an untrusted movement input from a browser client.
 * Returns null for malformed, replayed or implausibly skipped sequence numbers.
 */
export function parsePlayerInput(payload: unknown, lastSequence: number): PlayerInput | null {
  if (!isRecord(payload)) return null;

  const sequence = payload.sequence;
  const moveX = payload.moveX;
  const moveZ = payload.moveZ;
  const yaw = payload.yaw;

  if (
    !isFiniteNumber(sequence) ||
    !Number.isSafeInteger(sequence) ||
    sequence <= lastSequence ||
    sequence - lastSequence > MAX_INPUT_STEP ||
    !isFiniteNumber(moveX) ||
    !isFiniteNumber(moveZ) ||
    !isFiniteNumber(yaw) ||
    typeof payload.sprint !== 'boolean'
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
    sprint: payload.sprint
  };
}
