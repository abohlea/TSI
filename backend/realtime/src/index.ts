import { defineRoom, defineServer } from 'colyseus';
import { FieldTestRoom } from './rooms/FieldTestRoom.js';
import { verifyFirebasePlayerToken } from './firebaseAuth.js';
import { issueSessionTicket } from './sessionTickets.js';

const port = Number.parseInt(process.env.PORT ?? '2567', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

const isProduction = process.env.NODE_ENV === 'production';
const localAuthEnabled = process.env.TSI_ENABLE_LOCAL_AUTH === 'true';
const localToken = process.env.TSI_LOCAL_DEV_TOKEN ?? '';
const ticketSecret = process.env.TSI_SESSION_TICKET_SECRET ?? '';
const allowedOrigins = new Set((process.env.TSI_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean));

if (isProduction && !process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID is required in production.');
}
if (isProduction && localAuthEnabled) {
  throw new Error('TSI local development authentication must never be enabled in production.');
}
if (isProduction && allowedOrigins.size === 0) {
  throw new Error('TSI_ALLOWED_ORIGINS must contain at least one trusted web origin.');
}
if (isProduction && ticketSecret.length < 32) {
  throw new Error('TSI_SESSION_TICKET_SECRET must contain at least 32 characters in production.');
}
if (!isProduction && localAuthEnabled && localToken.length < 24) {
  throw new Error('TSI_LOCAL_DEV_TOKEN must contain at least 24 characters for local testing.');
}

interface RequestLike extends AsyncIterable<Uint8Array> {
  headers: { authorization?: string | string[]; origin?: string | string[] };
  ip?: string;
  socket?: { remoteAddress?: string };
}
interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: Record<string, unknown>): unknown;
  setHeader(name: string, value: string): void;
  end(): unknown;
}
const ticketRequests = new Map<string, { count: number; resetAt: number }>();
const TICKET_RATE_LIMIT = 10;
const TICKET_RATE_WINDOW_MS = 60_000;

const server = defineServer({
  devMode: !isProduction,
  rooms: {
    field_test: defineRoom(FieldTestRoom)
  },
  express: (app) => {
    app.get('/health', (_request: unknown, response: ResponseLike) => {
      response.status(200).json({
        service: 'tsi-realtime',
        status: 'ok',
        environment: isProduction ? 'production' : 'development',
        room: 'field_test'
      });
    });

    app.options('/auth/session-ticket', (request: unknown, response: ResponseLike) => {
      const origin = (request as RequestLike).headers.origin;
      if (typeof origin !== 'string' || !allowedOrigins.has(origin)) {
        response.status(403).json({ error: 'Origin not allowed.' });
        return;
      }
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization');
      response.status(204).end();
    });

    app.post('/auth/session-ticket', async (request: unknown, response: ResponseLike) => {
      if (!isProduction) {
        response.status(404).json({ error: 'Session-ticket endpoint is production-only.' });
        return;
      }
      const req = request as RequestLike;
      const origin = req.headers.origin;
      if (typeof origin === 'string') {
        if (!allowedOrigins.has(origin)) {
          response.status(403).json({ error: 'Origin not allowed.' });
          return;
        }
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
      }
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      const now = Date.now();
      const bucket = ticketRequests.get(ip);
      if (bucket && bucket.resetAt > now && bucket.count >= TICKET_RATE_LIMIT) {
        response.status(429).json({ error: 'Too many session-ticket requests.' });
        return;
      }
      if (!bucket || bucket.resetAt <= now) {
        ticketRequests.set(ip, { count: 1, resetAt: now + TICKET_RATE_WINDOW_MS });
      } else {
        bucket.count += 1;
      }

      const authorization = req.headers.authorization;
      const match = typeof authorization === 'string'
        ? /^Bearer ([^\s]+)$/.exec(authorization)
        : null;
      if (!match) {
        response.status(401).json({ error: 'Firebase bearer token required.' });
        return;
      }
      try {
        const identity = await verifyFirebasePlayerToken(match[1]!);
        const sessionTicket = issueSessionTicket(identity.playerId);
        response.status(200).json({ sessionTicket, expiresInMs: 45_000 });
      } catch {
        response.status(401).json({ error: 'Firebase authentication failed.' });
      }
    });
  }
});

await server.listen(port, isProduction ? undefined : '127.0.0.1');
console.info(`TSI local realtime prototype listening on port ${port}`);
