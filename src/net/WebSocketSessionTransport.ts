import type { SessionPlayer, SessionState, TrackId } from '../types';
import {
  NotHostError,
  SessionFullError,
  SessionNotFoundError,
  type SessionTransport,
} from './SessionTransport';

/**
 * The wire protocol below mirrors the DaddyRacing Session Server's
 * `src/protocol.ts` by hand (no shared package exists between the two
 * repos yet; keep both in sync manually if either side's messages change).
 */
type ClientMessage =
  | { type: 'createSession'; name: string }
  | { type: 'joinSession'; sessionId: string; name: string }
  | { type: 'selectKart'; kartId: string }
  | { type: 'selectTrack'; trackId: string }
  | { type: 'setReady'; ready: boolean };

interface WireSessionState {
  sessionId: string;
  players: Array<{
    playerId: string;
    name: string;
    isHost: boolean;
    kartId: string | null;
    ready: boolean;
  }>;
  selectedTrackId: TrackId | null;
  raceStarted: boolean;
}

type ServerMessage =
  | { type: 'joined'; playerId: string; state: WireSessionState }
  | { type: 'state'; state: WireSessionState }
  | { type: 'hostReassigned' }
  | { type: 'error'; message: string };

/** The subset of the browser `WebSocket` API this transport depends on, so tests can supply a fake. */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: any) => void): void;
}

const READY_STATE_OPEN = 1;

export type WebSocketFactory = (url: string) => WebSocketLike;

function defaultWebSocketFactory(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

function defaultServerUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080';
  const configured = new URLSearchParams(window.location.search).get('server');
  if (configured) return configured;
  // Assume the Session Server runs on the same LAN host that served this
  // page, which is true for the expected deployment (one host machine runs
  // both); `?server=ws://<host>:<port>` overrides this for any other setup.
  return `ws://${window.location.hostname}:8080`;
}

function toSessionState(wire: WireSessionState): SessionState {
  return {
    sessionId: wire.sessionId,
    selectedTrackId: wire.selectedTrackId,
    raceStarted: wire.raceStarted,
    players: wire.players.map(
      (p): SessionPlayer => ({
        playerId: p.playerId,
        name: p.name,
        isHost: p.isHost,
        kartId: p.kartId,
        ready: p.ready,
      }),
    ),
  };
}

function errorFromMessage(message: string, sessionIdForError: string | undefined): Error {
  if (message === 'session full') return new SessionFullError();
  if (message === 'only the session host can select the track') return new NotHostError();
  if (sessionIdForError && message.startsWith('no session found for identifier')) {
    return new SessionNotFoundError(sessionIdForError);
  }
  return new Error(message);
}

interface PendingRequest {
  resolve: (state: SessionState) => void;
  reject: (error: Error) => void;
  sessionIdForError?: string;
}

/**
 * Real `SessionTransport` over a WebSocket connection to the DaddyRacing
 * Session Server. Each lobby call (create/join/selectKart/selectTrack/
 * setReady) sends one `ClientMessage` and resolves on the next `joined` or
 * `state` reply; the server never tags replies with a request id, so this
 * assumes the client issues one such call at a time, which matches how the
 * UI (`JoinScreen`/`PreRaceSetupUI`) actually drives it today.
 */
export class WebSocketSessionTransport implements SessionTransport {
  private socket: WebSocketLike | null = null;
  private connectPromise: Promise<void> | null = null;
  private state: SessionState | null = null;
  private listeners = new Set<(state: SessionState) => void>();
  private pending: PendingRequest | null = null;

  constructor(
    private readonly serverUrl: string = defaultServerUrl(),
    private readonly createSocket: WebSocketFactory = defaultWebSocketFactory,
  ) {}

  async createSession(hostName: string): Promise<SessionState> {
    await this.ensureConnected();
    return this.request({ type: 'createSession', name: hostName });
  }

  async joinSession(sessionId: string, playerName: string): Promise<SessionState> {
    await this.ensureConnected();
    return this.request({ type: 'joinSession', sessionId, name: playerName }, sessionId);
  }

  async selectKart(kartId: string): Promise<SessionState> {
    return this.request({ type: 'selectKart', kartId });
  }

  async selectTrack(trackId: TrackId): Promise<SessionState> {
    return this.request({ type: 'selectTrack', trackId });
  }

  async setReady(ready: boolean): Promise<SessionState> {
    return this.request({ type: 'setReady', ready });
  }

  onStateChange(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): SessionState | null {
    return this.state;
  }

  disconnect(): void {
    this.listeners.clear();
    this.socket?.close();
    this.socket = null;
    this.connectPromise = null;
  }

  private ensureConnected(): Promise<void> {
    if (this.socket && this.socket.readyState === READY_STATE_OPEN) {
      return Promise.resolve();
    }
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = this.createSocket(this.serverUrl);
      this.socket = socket;
      socket.addEventListener('open', () => resolve());
      socket.addEventListener('error', () => {
        this.connectPromise = null;
        reject(new Error(`could not reach the session server at ${this.serverUrl}`));
      });
      socket.addEventListener('message', (event: { data: unknown }) => this.handleMessage(event));
      socket.addEventListener('close', () => {
        this.socket = null;
        this.connectPromise = null;
      });
    });
    return this.connectPromise;
  }

  private request(message: ClientMessage, sessionIdForError?: string): Promise<SessionState> {
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN) {
      return Promise.reject(new Error('not connected to the session server'));
    }
    if (this.pending) {
      return Promise.reject(new Error('a previous request is still awaiting a response'));
    }
    return new Promise<SessionState>((resolve, reject) => {
      this.pending = { resolve, reject, sessionIdForError };
      this.socket!.send(JSON.stringify(message));
    });
  }

  private handleMessage(event: { data: unknown }): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
    } catch {
      return;
    }

    switch (message.type) {
      case 'joined': {
        const state = toSessionState(message.state);
        this.state = state;
        this.resolvePending(state);
        this.emit(state);
        break;
      }
      case 'state': {
        const state = toSessionState(message.state);
        this.state = state;
        this.resolvePending(state);
        this.emit(state);
        break;
      }
      case 'hostReassigned': {
        // Always followed by a 'state' broadcast carrying the updated
        // isHost flags, so there is nothing to apply from this message alone.
        break;
      }
      case 'error': {
        this.rejectPending(errorFromMessage(message.message, this.pending?.sessionIdForError));
        break;
      }
    }
  }

  private resolvePending(state: SessionState): void {
    if (!this.pending) return;
    const { resolve } = this.pending;
    this.pending = null;
    resolve(state);
  }

  private rejectPending(error: Error): void {
    if (!this.pending) return;
    const { reject } = this.pending;
    this.pending = null;
    reject(error);
  }

  private emit(state: SessionState): void {
    for (const listener of this.listeners) listener(structuredClone(state));
  }
}
