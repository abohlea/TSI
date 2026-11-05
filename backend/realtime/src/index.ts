import { defineRoom, defineServer } from 'colyseus';
import { FieldTestRoom } from './rooms/FieldTestRoom.js';

const port = Number.parseInt(process.env.PORT ?? '2567', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

const isProduction = process.env.NODE_ENV === 'production';
const localAuthEnabled = process.env.TSI_ENABLE_LOCAL_AUTH === 'true';
const localToken = process.env.TSI_LOCAL_DEV_TOKEN ?? '';

if (isProduction && localAuthEnabled) {
  throw new Error('TSI local development authentication must never be enabled in production.');
}
if (!isProduction && localAuthEnabled && localToken.length < 24) {
  throw new Error('TSI_LOCAL_DEV_TOKEN must contain at least 24 characters for local testing.');
}

const server = defineServer({
  devMode: !isProduction,
  rooms: {
    field_test: defineRoom(FieldTestRoom)
  },
  express: (app) => {
    app.get('/health', (_request: unknown, response: { status(code: number): { json(body: Record<string, string>): unknown } }) => {
      response.status(200).json({
        service: 'tsi-realtime',
        status: 'ok',
        environment: isProduction ? 'production' : 'development',
        room: 'field_test'
      });
    });
  }
});

await server.listen(port, isProduction ? undefined : '127.0.0.1');
console.info(`TSI local realtime prototype listening on port ${port}`);
