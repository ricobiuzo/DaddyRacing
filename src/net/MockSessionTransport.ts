import {
  MAX_PLAYERS_PER_SESSION,
  type SessionPlayer,
  type SessionState,
  type TrackId,
} from '../types';
import {
  NotHostError,
  SessionFullError,
  SessionNotFoundError,
  type SessionTransport,
} from './SessionTransport';

/**
 * In-memory stand-in for the DaddyRacing Session Server. The Session Server
 * Application isn't implemented yet (this CR covers only the Game Client),
 * so this lets the client's session/lobby, track-selection, and ready-state
 * behaviour be built and tested against the real SessionTransport contract
 * today. Swap WebSocketSessionTransport in once the server exists; nothing
 * above this layer needs to change.
 */
export class MockSessionTransport implements SessionTransport {
  private static sessions = new Map<string, SessionState>();

  private sessionId: string | null = null;
  private playerId: string;
  private listeners = new Set<(state: SessionState) => void>();

  constructor(playerId: string = crypto.randomUUID()) {
    this.playerId = playerId;
  }

  async createSession(hostName: string): Promise<SessionState> {
    const sessionId = Math.random().toString(36).slice(2, 8).toUpperCase();
    const host: SessionPlayer = {
      playerId: this.playerId,
      name: hostName,
      isHost: true,
      kartId: null,
      ready: false,
    };
    const state: SessionState = {
      sessionId,
      players: [host],
      selectedTrackId: null,
      raceStarted: false,
    };
    MockSessionTransport.sessions.set(sessionId, state);
    this.sessionId = sessionId;
    this.emit(state);
    return state;
  }

  async joinSession(sessionId: string, playerName: string): Promise<SessionState> {
    const state = MockSessionTransport.sessions.get(sessionId);
    if (!state) {
      throw new SessionNotFoundError(sessionId);
    }
    if (state.players.length >= MAX_PLAYERS_PER_SESSION) {
      throw new SessionFullError();
    }
    const player: SessionPlayer = {
      playerId: this.playerId,
      name: playerName,
      isHost: false,
      kartId: null,
      ready: false,
    };
    state.players.push(player);
    this.sessionId = sessionId;
    this.emit(state);
    return state;
  }

  async selectKart(kartId: string): Promise<SessionState> {
    const state = this.requireState();
    const player = state.players.find((p) => p.playerId === this.playerId);
    if (player) player.kartId = kartId;
    this.emit(state);
    return state;
  }

  async selectTrack(trackId: TrackId): Promise<SessionState> {
    const state = this.requireState();
    const self = state.players.find((p) => p.playerId === this.playerId);
    if (!self?.isHost) {
      throw new NotHostError();
    }
    state.selectedTrackId = trackId;
    this.emit(state);
    return state;
  }

  async setReady(ready: boolean): Promise<SessionState> {
    const state = this.requireState();
    const player = state.players.find((p) => p.playerId === this.playerId);
    if (player) player.ready = ready;
    if (state.players.length > 0 && state.players.every((p) => p.ready && p.kartId)) {
      state.raceStarted = true;
    }
    this.emit(state);
    return state;
  }

  onStateChange(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): SessionState | null {
    if (!this.sessionId) return null;
    return MockSessionTransport.sessions.get(this.sessionId) ?? null;
  }

  disconnect(): void {
    this.listeners.clear();
  }

  private requireState(): SessionState {
    const state = this.getState();
    if (!state) throw new Error('not in a session');
    return state;
  }

  private emit(state: SessionState): void {
    for (const listener of this.listeners) listener(structuredClone(state));
  }
}
