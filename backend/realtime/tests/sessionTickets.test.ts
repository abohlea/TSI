import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeSessionTicket, issueSessionTicket } from '../src/sessionTickets.js';

test('session tickets are signed, short-lived and single-use', () => {
  process.env.TSI_SESSION_TICKET_SECRET = 'test-only-session-ticket-secret-32';
  const ticket = issueSessionTicket('firebase-uid-123', 1_000_000);
  assert.deepEqual(consumeSessionTicket(ticket, 1_000_001), { playerId: 'firebase-uid-123' });
  assert.throws(() => consumeSessionTicket(ticket, 1_000_002), /expired or already used/);
});

test('session tickets expire after their short validity window', () => {
  process.env.TSI_SESSION_TICKET_SECRET = 'test-only-session-ticket-secret-32';
  const ticket = issueSessionTicket('firebase-uid-expiry', 2_000_000);
  assert.throws(() => consumeSessionTicket(ticket, 2_045_000), /expired or already used/);
});

test('session tickets reject tampering', () => {
  process.env.TSI_SESSION_TICKET_SECRET = 'test-only-session-ticket-secret-32';
  const ticket = issueSessionTicket('firebase-uid-tamper', 3_000_000);
  const [payload, signature] = ticket.split('.');
  const changedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  const tampered = `${payload}.${changedSignature}`;
  assert.throws(() => consumeSessionTicket(tampered, 3_000_001), /signature/);
});
