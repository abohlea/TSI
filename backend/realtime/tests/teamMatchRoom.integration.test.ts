import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { defineRoom, defineServer } from 'colyseus';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { TeamMatchRoom } from '../src/rooms/TeamMatchRoom.js';

const DEV_TOKEN = 'tsi-integration-test-token-2026';
let colyseus: ColyseusTestServer;

describe('TeamMatchRoom Colyseus integration', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TSI_ENABLE_LOCAL_AUTH = 'true';
    process.env.TSI_LOCAL_DEV_TOKEN = DEV_TOKEN;
    const server = defineServer({
      rooms: { team_match: defineRoom(TeamMatchRoom) }
    });
    colyseus = await boot(server);
  });

  after(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it('balances ten real clients across two teams and rejects an eleventh', async () => {
    const room = await colyseus.createRoom('team_match');
    const clients = [];
    const teamCounts = { alpha: 0, bravo: 0 };

    for (let index = 0; index < 10; index += 1) {
      const client = await colyseus.connectTo(room, { devToken: DEV_TOKEN });
      clients.push(client);
      const welcome = await client.waitForMessage('team-welcome');
      assert.ok(welcome.team === 'alpha' || welcome.team === 'bravo');
      teamCounts[welcome.team] += 1;
    }

    assert.equal(room.clients.length, 10);
    assert.deepEqual(teamCounts, { alpha: 5, bravo: 5 });

    const roster = await clients[9]!.waitForMessage('team-players');
    assert.equal(roster.length, 10);
    assert.equal(roster.filter((player: { connected: boolean }) => player.connected).length, 10);

    await assert.rejects(
      () => colyseus.connectTo(room, { devToken: DEV_TOKEN }),
      /maximum number of clients|room is full|seat reservation/i
    );
  });

  it('restores the same player seat and team after an unexpected connection drop', async () => {
    const room = await colyseus.createRoom('team_match');
    const observer = await colyseus.connectTo(room, { devToken: DEV_TOKEN });
    const player = await colyseus.connectTo(room, { devToken: DEV_TOKEN });
    const welcome = await player.waitForMessage('team-welcome');
    const originalSessionId = player.sessionId;

    const droppedRoster = observer.waitForMessage('team-players');
    player.connection.close(4010);
    const roster = await droppedRoster;
    const droppedPlayer = roster.find((entry: { playerId: string; connected: boolean }) =>
      entry.playerId === welcome.playerId
    );
    assert.equal(droppedPlayer?.connected, false);

    const reconnected = new Promise<void>((resolve) => player.onReconnect(resolve));
    await reconnected;

    assert.equal(player.sessionId, originalSessionId);
    const restoredRoster = await observer.waitForMessage('team-players');
    const restoredPlayer = restoredRoster.find((entry: { playerId: string; connected: boolean }) =>
      entry.playerId === welcome.playerId
    );
    assert.equal(restoredPlayer?.connected, true);
    assert.equal(room.clients.length, 2);
  });
});
