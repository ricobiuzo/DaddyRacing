import type { SessionState, TrackId } from '../types';

/**
 * Transport-agnostic contract between the UI/game layer and a race session.
 * A WebSocketSessionTransport (talking to the DaddyRacing Session Server)
 * and MockSessionTransport (local, no server) both implement this so the
 * rest of the client never depends on which one is active.
 */
export interface SessionTransport {
  createSession(hostName: string): Promise<SessionState>;
  joinSession(sessionId: string, playerName: string): Promise<SessionState>;
  selectKart(kartId: string): Promise<SessionState>;
  /** Host-only; rejects if the caller is not the session host. */
  selectTrack(trackId: TrackId): Promise<SessionState>;
  setReady(ready: boolean): Promise<SessionState>;
  onStateChange(listener: (state: SessionState) => void): () => void;
  getState(): SessionState | null;
  disconnect(): void;
}

export class SessionFullError extends Error {
  constructor() {
    super('session full');
  }
}

export class NotHostError extends Error {
  constructor() {
    super('only the session host can select the track');
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`no session found for identifier "${sessionId}"`);
  }
}
