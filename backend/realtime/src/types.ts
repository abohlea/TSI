export interface PlayerInput {
  sequence: number;
  moveX: number;
  moveZ: number;
  yaw: number;
  pitch: number;
  sprint: boolean;
  shoot: boolean;
}

export interface PlayerSnapshot {
  playerId: string;
  x: number;
  z: number;
  yaw: number;
  health: number;
}

export interface TargetSnapshot {
  targetId: string;
  health: number;
  active: boolean;
}

export interface PrivatePlayerSnapshot {
  ammo: number;
  reserve: number;
  score: number;
}

export interface RoomSnapshot {
  serverTime: number;
  players: PlayerSnapshot[];
  targets: TargetSnapshot[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
