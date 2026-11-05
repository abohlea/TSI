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

For Firebase emulator testing instead, start Auth and Firestore emulators from the repository root (`firebase emulators:start --only auth,firestore`), configure the commented local Firebase variables in this server `.env`, and fill the `VITE_FIREBASE_*` values in the client `.env.local`. The client can then use Firebase sign-in to exchange an ID token for a one-time ticket; local-token authentication remains available as a fallback.

7. Start the browser client:

   ```bash
   npm run dev
   ```

8. Open the Vite URL. Select **REJOINDRE LE SERVEUR DE TEST**. Open a second browser window on the same machine and repeat to see the other test operator.

Health check: `http://localhost:2567/health`.

## Match result persistence

Only Firebase-ticket-authenticated participants are included in persisted results. When the temporary field_test room is disposed (normally after its clients leave), the server writes matchSummaries/{roomId} and updates each participant's playerStats/{uid} counters in one Firestore transaction. The room state is the sole source of scores, kills and deaths; local development-token sessions are deliberately excluded. The transaction uses the room ID as an idempotency key, so a repeated dispose/retry cannot increment statistics twice.

This is an early session-level result, not yet a formal round/match lifecycle: there is no match timer, score limit, team rule, or explicit match-complete event. A server crash before room disposal can still lose the in-memory result. Production-grade match finalization will need durable event handling and recovery.

## Local Cloudinary avatar setup

1. Create a signed upload preset in Cloudinary, for example tsi_player_avatar_signed, restricted to image formats JPG/JPEG/PNG/WebP.
2. Copy the Cloudinary cloud name, API key, API secret and preset name into the optional CLOUDINARY_* entries in backend/realtime/.env. Never add the API secret to a VITE_* variable or commit a real .env.
3. Keep TSI_MEDIA_API_PORT=2568 and allow only the Vite origins you use in TSI_MEDIA_ALLOWED_ORIGINS.
4. Set VITE_TSI_MEDIA_API_URL=http://localhost:2568 in prototype/.env.local.
5. Start the realtime server and PlayCanvas client, sign in with Firebase, then use CHOISIR UN AVATAR in the start panel.

The Media API binds to 127.0.0.1 and is disabled in production. The browser sends the image bytes to the authenticated API; the server enforces the 5 MiB streaming limit, checks JPEG/PNG/WebP file signatures, uploads to Cloudinary with server credentials, validates the returned asset metadata and only then saves the profile. Oversized requests are rejected before any Cloudinary upload (the request can still consume bandwidth to the local API). The API remains local preproduction only: public deployment still needs TLS, App Check, distributed abuse controls, request timeouts and operational monitoring.

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
- Firebase clients (including local emulator clients) exchange an ID token for a 45-second signed game-session ticket at `POST /auth/session-ticket` using `Authorization: Bearer <Firebase-ID-token>`. The room accepts that ticket and consumes it once during room authentication. Production refuses joins without the ticket; local-token fallback is development-only.
- Configure `TSI_SESSION_TICKET_SECRET` with at least 32 random characters and `TSI_ALLOWED_ORIGINS` with comma-separated exact browser origins in the production runtime. Keep it outside GitHub and rotate it through the deployment secret manager.
- The endpoint has a basic per-IP in-memory limit (10 requests/minute). The ticket nonce store is also in-memory and single-process only; before horizontal scaling, replace both with a shared atomic store such as Redis. Do not run multiple production instances with this prototype ticket store.
- Do not expose this local server to the public internet or reuse the token for any other service.
- Production joins use short-lived signed tickets. The client exchanges a Firebase Authentication ID token at `POST /auth/session-ticket`; the server verifies it with Firebase Admin (including revoked-token checks) and returns a ticket valid for 45 seconds.
- The ticket is HMAC-SHA256 signed with `TSI_SESSION_TICKET_SECRET` (minimum 32 characters) and is consumed once by the room authentication hook.
- The prototype now includes Firebase Web SDK Google sign-in and requests the ticket before joining. Configure the Firebase Web App values in `prototype/.env.local`, enable Google as a sign-in provider, and add the browser domain to Firebase Authentication authorized domains.
- On the first successful ticket exchange, the trusted server creates missing `users/{uid}`, `playerProfiles/{uid}` and `progression/{uid}` documents in one Firestore transaction. Existing profile/progression data is never overwritten by a later login.
- Production runtime must provide Application Default Credentials/workload identity, `FIREBASE_PROJECT_ID`, and `TSI_SESSION_TICKET_SECRET`. Never commit service-account private keys.
- The ticket nonce store and basic per-IP rate limit are in-memory and single-process only. Do not horizontally scale this prototype; use a shared atomic store (for example Redis) before running multiple server instances.
- The Firebase client, one-time ticket exchange and idempotent profile provisioning are wired in code. Idempotent match-summary/player-stat persistence and the local signed Cloudinary avatar path are now implemented and covered by emulator/unit tests in CI. A real Firebase/Cloudinary project, production origin configuration and end-to-end deployment validation are still required.
- The local room now includes experimental free-for-all player damage, health, eliminations and timed respawns. For Firebase-authenticated players, room disposal writes an idempotent match summary and aggregated `playerStats/{uid}` counters through a Firestore transaction. Local development-token sessions are deliberately excluded from persistent competitive stats.
- Cloudinary avatar uploads are now ported to `backend/realtime`: the local Media API issues signed, single-purpose uploads, verifies the resulting asset with Cloudinary Admin API, and only then updates `playerProfiles/{uid}.avatar`. The PlayCanvas overlay includes an avatar picker/preview. Configure all four `CLOUDINARY_*` values and a signed preset to enable it; otherwise the service remains disabled.
- Cloudinary avatar bytes now pass through the authenticated Media API: a 5 MiB streaming cap and JPEG/PNG/WebP magic-byte checks run before the server calls Cloudinary. The browser no longer receives upload signatures or sends files directly to Cloudinary. The Media API still binds to loopback and is intentionally disabled in production until TLS, App Check, distributed abuse controls, request timeouts, monitoring and a hardened deployment are provided.
- Teams, rounds, revives, hitbox animation/validation, lag compensation, full anti-cheat analysis and production matchmaking are not implemented yet.
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
