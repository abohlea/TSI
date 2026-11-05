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
- Clients send sequenced movement and aim inputs.
- The server validates finite input values, sequence order, pitch range and normalized movement magnitude.
- The server applies movement speed limits, world bounds and practice-map obstacle collisions.
- The server owns target and player health, shot cooldown, magazine, reserve ammo, reload completion, score, target respawn and player respawn.
- Free-for-all player hits use a provisional server-side spherical hitbox; obstacles block shots, eliminated players cannot act, and respawn is scheduled after four seconds.
- The server performs a simple ray/sphere hit test and blocks shots behind the practice-map obstacle boxes.
- Public room snapshots contain player positions and target states; each player receives their own ammo and score privately.
- Clients interpolate remote player silhouettes.

## Security limitations

- The local token is only a development guard. It is delivered to the browser and is not a production credential. Production authentication uses Firebase ID tokens verified server-side.
- Production clients exchange a Firebase Authentication ID token for a 45-second signed game-session ticket at `POST /auth/session-ticket` using `Authorization: Bearer <Firebase-ID-token>`. The room accepts only that ticket; the ticket is consumed once during room authentication.
- Configure `TSI_SESSION_TICKET_SECRET` with at least 32 random characters and `TSI_ALLOWED_ORIGINS` with comma-separated exact browser origins in the production runtime. Keep it outside GitHub and rotate it through the deployment secret manager.
- The endpoint has a basic per-IP in-memory limit (10 requests/minute). The ticket nonce store is also in-memory and single-process only; before horizontal scaling, replace both with a shared atomic store such as Redis. Do not run multiple production instances with this prototype ticket store.
- Do not expose this local server to the public internet or reuse the token for any other service.
- Production joins use short-lived signed tickets. The client exchanges a Firebase Authentication ID token at `POST /auth/session-ticket`; the server verifies it with Firebase Admin (including revoked-token checks) and returns a ticket valid for 45 seconds.
- The ticket is HMAC-SHA256 signed with `TSI_SESSION_TICKET_SECRET` (minimum 32 characters) and is consumed once by the room authentication hook.
- The prototype now includes Firebase Web SDK Google sign-in and requests the ticket before joining. Configure the Firebase Web App values in `prototype/.env.local`, enable Google as a sign-in provider, and add the browser domain to Firebase Authentication authorized domains.
- Production runtime must provide Application Default Credentials/workload identity, `FIREBASE_PROJECT_ID`, and `TSI_SESSION_TICKET_SECRET`. Never commit service-account private keys.
- The ticket nonce store and basic per-IP rate limit are in-memory and single-process only. Do not horizontally scale this prototype; use a shared atomic store (for example Redis) before running multiple server instances.
- The Firebase client and one-time ticket exchange are wired in code, but still require a real Firebase project, production origin configuration, cross-origin deployment validation, and integration tests.
- The local room now includes experimental free-for-all player damage, health, eliminations and timed respawns. Teams, rounds, revives, hitbox animation/validation, lag compensation, full anti-cheat analysis, persistent results and production matchmaking are not implemented yet.
- Do not use this room for public or ranked matches.

The room validates movement, practice-target combat and a first free-for-all PvP loop. Player hitboxes are simple spheres and the raycast uses the training world's obstacle boxes; this is not yet a complete physics or competitive combat simulation.

## Useful commands

```bash
npm run typecheck
npm test
npm run build
npm start
```

The commands above have not been verified against the package registry in every execution environment. If installation fails, verify the network and Node/npm versions before changing pinned dependency versions.
