# TSI Field Test Server

This is a **local development-only** Colyseus room used to prove server-side movement, ammunition, target damage and respawn rules.

## Start

Requirements: Node.js 22.12+ and npm.

```bash
cd server
cp .env.example .env
```

Edit `.env` and replace `TSI_LOCAL_DEV_TOKEN` with a private random value of at least 24 characters. Do not commit the real `.env` file.

```bash
npm install
npm run dev
```

The server binds to `127.0.0.1:2567` only. It refuses to start when `NODE_ENV=production`, and joins require the local development token. It is not reachable by other devices on the network and must not be exposed to the public internet.

## Checks

```bash
npm run check
npm test
```

## Current messages

- `input`: sequence number, movement axes and yaw. The server validates finite values, bounds, sequence monotonicity and movement magnitude.
- `fire`: no client-supplied target or damage. The server checks cooldown, ammunition and the current facing direction against training targets.
- `reload`: the server owns the reload timer and ammunition transfer.

The room is capped at eight development clients. It is a networking and authority proof, not the production Battle Royale server. Firebase identity, signed production tickets, matchmaking, player-versus-player damage, persistence, production deployment and load certification are not implemented.

## Safety boundary

The local token is sent by a development browser client and is therefore **not a production secret**. The loopback bind and production refusal are intentional guardrails. Before any remote test, replace this gate with Firebase ID-token verification and short-lived server-issued session tickets; then configure a reviewed host and network policy.
