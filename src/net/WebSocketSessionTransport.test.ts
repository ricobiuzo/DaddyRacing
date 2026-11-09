import { describe, expect, it, vi } from 'vitest';
import { NotHostError, SessionFullError, SessionNotFoundError } from './SessionTransport';
import { WebSocketSessionTransport, type WebSocketLike } from './WebSocketSessionTransport';

type Listener = (event: any) => void;

class FakeSocket implements WebSocketLike {
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, Listener[]> = {};

  addEventListener(type: string, listener: Listener): void {
    (this.listeners[type] ??= []).push(listener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.fire('close', {});
  }

  open(): void {
    this.readyState = 1;
    this.fire('open', {});
  }

  receive(message: unknown): void {
    this.fire('message', { data: JSON.stringify(message) });
  }

  private fire(type: string, event: unknown): void {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

function createConnectedTransport(): { transport: WebSocketSessionTransport; socket: FakeSocket } {
  const socket = new FakeSocket();
  const transport = new WebSocketSessionTransport('ws://test', () => socket);
  return { transport, socket };
}

/** Opens the fake socket and waits for the queued request to actually be sent. */
async function waitForSend(socket: FakeSocket, expectedCount: number): Promise<void> {
  await vi.waitFor(() => expect(socket.sent.length).toBe(expectedCount));
}

async function createJoinedTransport(): Promise<{ transport: WebSocketSessionTransport; socket: FakeSocket }> {
  const { transport, socket } = createConnectedTransport();
  const joinPromise = transport.joinSession('ABC123', 'Guest');
  socket.open();
  await waitForSend(socket, 1);
  socket.receive({
    type: 'joined',
    playerId: 'p2',
    state: { sessionId: 'ABC123', players: [], selectedTrackId: null, raceStarted: false },
  });
  await joinPromise;
  return { transport, socket };
}

describe('WebSocketSessionTransport', () => {
  it('resolves createSession with the state from the server\'s "joined" reply', async () => {
    const { transport, socket } = createConnectedTransport();
    const promise = transport.createSession('Host');
    socket.open();
    await waitForSend(socket, 1);

    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'createSession', name: 'Host' });
    socket.receive({
      type: 'joined',
      playerId: 'p1',
      state: { sessionId: 'ABC123', players: [{ playerId: 'p1', name: 'Host', isHost: true, kartId: null, ready: false }], selectedTrackId: null, raceStarted: false },
    });

    const state = await promise;
    expect(state.sessionId).toBe('ABC123');
    expect(transport.getState()).toEqual(state);
  });

  it('rejects joinSession with SessionNotFoundError on a matching server error', async () => {
    const { transport, socket } = createConnectedTransport();
    const promise = transport.joinSession('NOPE99', 'Guest');
    socket.open();
    await waitForSend(socket, 1);
    socket.receive({ type: 'error', message: 'no session found for identifier "NOPE99"' });

    await expect(promise).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it('rejects with SessionFullError when the server reports a full session', async () => {
    const { transport, socket } = createConnectedTransport();
    const promise = transport.joinSession('FULL01', 'Guest');
    socket.open();
    await waitForSend(socket, 1);
    socket.receive({ type: 'error', message: 'session full' });

    await expect(promise).rejects.toBeInstanceOf(SessionFullError);
  });

  it('rejects selectTrack with NotHostError when the server refuses a non-host', async () => {
    const { transport, socket } = await createJoinedTransport();

    const promise = transport.selectTrack('green-hills');
    await waitForSend(socket, 2);
    socket.receive({ type: 'error', message: 'only the session host can select the track' });

    await expect(promise).rejects.toBeInstanceOf(NotHostError);
  });

  it('updates state and notifies listeners on a broadcasted "state" message', async () => {
    const { transport, socket } = await createJoinedTransport();

    const seen: boolean[] = [];
    transport.onStateChange((state) => seen.push(state.raceStarted));

    socket.receive({
      type: 'state',
      state: { sessionId: 'ABC123', players: [], selectedTrackId: 'green-hills', raceStarted: true },
    });

    expect(seen).toEqual([true]);
    expect(transport.getState()?.raceStarted).toBe(true);
  });

  it('ignores a standalone "hostReassigned" message (the following "state" carries the change)', async () => {
    const { transport, socket } = await createJoinedTransport();

    expect(() => socket.receive({ type: 'hostReassigned' })).not.toThrow();
    expect(transport.getState()?.sessionId).toBe('ABC123');
  });
});
