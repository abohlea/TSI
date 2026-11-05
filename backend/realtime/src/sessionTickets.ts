import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const TICKET_TTL_MS = 45_000;
const consumedNonces = new Map<string, number>();

interface TicketPayload {
  sub: string;
  exp: number;
  nonce: string;
}

function getSecret(): string {
  const secret = process.env.TSI_SESSION_TICKET_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error('TSI_SESSION_TICKET_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signature(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest();
}

function pruneExpired(now: number): void {
  for (const [nonce, expiresAt] of consumedNonces) {
    if (expiresAt <= now) consumedNonces.delete(nonce);
  }
}

/** Creates a signed, short-lived ticket. The nonce is tracked for single-use validation. */
export function issueSessionTicket(playerId: string, now = Date.now()): string {
  if (!playerId || playerId.length > 128) throw new Error('Invalid player identity.');
  const secret = getSecret();
  pruneExpired(now);
  const payload: TicketPayload = {
    sub: playerId,
    exp: now + TICKET_TTL_MS,
    nonce: randomUUID()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  consumedNonces.set(payload.nonce, payload.exp);
  return `${encoded}.${signature(encoded, secret).toString('base64url')}`;
}

/** Validates and atomically consumes a ticket in this Node.js process. */
export function consumeSessionTicket(ticket: string, now = Date.now()): { playerId: string } {
  const secret = getSecret();
  if (typeof ticket !== 'string' || ticket.length > 2048) throw new Error('Invalid session ticket.');
  const parts = ticket.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Invalid session ticket.');
  const [encoded, suppliedSignature] = parts;
  const expected = signature(encoded, secret);
  let actual: Buffer;
  try {
    actual = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    throw new Error('Invalid session ticket signature.');
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid session ticket signature.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid session ticket payload.');
  }
  if (
    typeof payload !== 'object' || payload === null ||
    !('sub' in payload) || typeof payload.sub !== 'string' || !payload.sub ||
    !('exp' in payload) || typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp) ||
    !('nonce' in payload) || typeof payload.nonce !== 'string' || !payload.nonce
  ) throw new Error('Invalid session ticket payload.');

  const typed = payload as TicketPayload;
  pruneExpired(now);
  if (typed.exp <= now || typed.exp > now + TICKET_TTL_MS || !consumedNonces.has(typed.nonce)) {
    throw new Error('Session ticket expired or already used.');
  }
  consumedNonces.delete(typed.nonce);
  return { playerId: typed.sub };
}
