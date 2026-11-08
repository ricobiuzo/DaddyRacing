import { describe, expect, it } from 'vitest';
import { MockSessionTransport } from './MockSessionTransport';
import { NotHostError, SessionFullError, SessionNotFoundError } from './SessionTransport';
import { MAX_PLAYERS_PER_SESSION } from '../types';

describe('MockSessionTransport (Create/Join, Track Selection, Ready, Session Capacity)', () => {
  it('creates a session with the creator as host', async () => {
    const host = new MockSessionTransport();
    const state = await host.createSession('Host');
    expect(state.players).toHaveLength(1);
    expect(state.players[0]?.isHost).toBe(true);
  });

  it('lets another player join by session identifier', async () => {
    const host = new MockSessionTransport();
    const created = await host.createSession('Host');
    const guest = new MockSessionTransport();
    const joined = await guest.joinSession(created.sessionId, 'Guest');
    expect(joined.players).toHaveLength(2);
    expect(joined.players.some((p) => p.name === 'Guest' && !p.isHost)).toBe(true);
  });

  it('rejects joining a session identifier that does not exist', async () => {
    const guest = new MockSessionTransport();
    await expect(guest.joinSession('NOPE12', 'Guest')).rejects.toThrow(SessionNotFoundError);
  });

  it('enforces the maximum number of players per session', async () => {
    const host = new MockSessionTransport();
    const created = await host.createSession('Host');
    for (let i = 1; i < MAX_PLAYERS_PER_SESSION; i += 1) {
      const guest = new MockSessionTransport();
      await guest.joinSession(created.sessionId, `Guest ${i}`);
    }
    const overflowGuest = new MockSessionTransport();
    await expect(overflowGuest.joinSession(created.sessionId, 'One Too Many')).rejects.toThrow(
      SessionFullError,
    );
  });

  it('only lets the host select the track', async () => {
    const host = new MockSessionTransport();
    const created = await host.createSession('Host');
    const guest = new MockSessionTransport();
    await guest.joinSession(created.sessionId, 'Guest');

    await expect(guest.selectTrack('green-hills')).rejects.toThrow(NotHostError);
    const state = await host.selectTrack('green-hills');
    expect(state.selectedTrackId).toBe('green-hills');
  });

  it('starts the race once every player has a kart and is ready', async () => {
    const host = new MockSessionTransport();
    await host.createSession('Host');
    await host.selectKart('kart-sprinter');
    const afterHostReady = await host.setReady(true);
    expect(afterHostReady.raceStarted).toBe(true);
  });
});
