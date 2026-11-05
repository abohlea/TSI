# TSI Field Test Server

This is a **local development-only** Colyseus room used to prove server-side movement, ammunition, practice-target damage, player-versus-player hitscan, elimination and respawn rules.

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
- `fire`: no client-supplied target or damage. The server checks cooldown and ammunition, then resolves the nearest visible impact among practice targets and opponents using server-owned positions, yaw and static map blockers.
- On a player elimination, the server updates the killer's eliminations and the victim's deaths, freezes the victim, then restores health and ammunition at a server-selected spawn after four seconds.
- `reload`: the server owns the reload timer and ammunition transfer.

The room is capped at eight development clients. PvP is a free-for-all proof using 2D circular hit volumes in the XZ plane and the static training-map blocker boxes. It has no teams, head/body hit zones, vertical hit validation, lag compensation, client reconciliation, production anti-cheat, Firebase identity, signed production tickets, matchmaking, persistence, public deployment or load certification. The current `game-client/` shell is not yet wired to this room, so this server increment is not an end-to-end playable PvP release.

## Safety boundary

The local token is sent by a development browser client and is therefore **not a production secret**. The loopback bind and production refusal are intentional guardrails. Before any remote test, replace this gate with Firebase ID-token verification and short-lived server-issued session tickets; then configure a reviewed host and network policy. Never put Firebase Admin credentials, Cloudinary API secrets or service-account keys in the browser client.
