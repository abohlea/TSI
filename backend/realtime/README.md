# TSI Realtime — local development only

This package starts the first Colyseus room used to verify the TSI client/server boundary. It is not a public matchmaking service and is not ready for production.

## Prerequisites

- Node.js 22.12 or newer
- npm
- The TSI Git repository

## Local setup

1. Install the server dependencies:

   ```bash
   cd backend/realtime
   npm install
   ```

2. Copy `.env.example` to `.env`.

3. Generate a random local-only token of at least 24 characters. Set it as `TSI_LOCAL_DEV_TOKEN` in this `.env` file.

4. Start the local room server:

   ```bash
   npm run dev
   ```

5. In another terminal, configure the prototype:

   ```bash
   cd prototype
   npm install
   ```

6. Copy `.env.example` to `.env.local`. Set `VITE_TSI_LOCAL_DEV_TOKEN` to the exact same local-only token and keep the server URL at `http://localhost:2567`.

7. Start the browser client:

   ```bash
   npm run dev
   ```

8. Open the Vite URL. Select **REJOINDRE LE SERVEUR DE TEST**. Open a second browser window on the same machine and repeat to see the other test operator.

Health check: `http://localhost:2567/health`.

## What this room currently proves

- A browser client can request a Colyseus room.
- The server rejects missing or incorrect local development tokens.
- The server creates a player identity and spawn point.
- Clients send sequenced movement intents.
- The server clamps input magnitude, applies a speed limit and world bounds.
- The server broadcasts snapshots; clients display remote player silhouettes.

## Security limitations

- The token is only a local development guard. It is delivered to the browser and is not a production credential.
- The room refuses all joins when `NODE_ENV=production`.
- Do not expose this local server to the public internet or reuse the token for any other service.
- Firebase Authentication and signed server tickets are not integrated yet.
- Server-side map collision, hit validation, health, weapon cooldowns, anti-cheat analysis, persistent results and matchmaking policies are not implemented yet.
- Do not use this room for public or ranked matches.

The room currently validates movement magnitude, input sequence and a broad world boundary. It is a network engineering test, not a complete authoritative combat simulation.

## Useful commands

```bash
npm run typecheck
npm test
npm run build
npm start
```

The commands above have not been verified against the package registry in every execution environment. If installation fails, verify the network and Node/npm versions before changing pinned dependency versions.
