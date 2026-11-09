// Shared domain types for the DaddyRacing Game Client.
//
// The wire protocol between this client and the DaddyRacing Session Server is
// not yet specified anywhere in Products[0] or the Developer CR (Target
// Environment / Backend framework are both "To be confirmed"). The shapes
// below are this CR's own proposal for that contract, kept intentionally
// small and named after the User Stories they implement. They are consumed
// through the SessionTransport interface (see net/SessionTransport.ts) so a
// real WebSocket implementation can replace MockSessionTransport once the
// Session Server exists, without any UI code changing.

export const MAX_PLAYERS_PER_SESSION = 8; // Enforce a Maximum Number of Players Per Race Session
export const TOTAL_LAPS = 5;
export const RACE_TIMEOUT_MS = 10 * 60 * 1000; // Race Start/Finish & 10-Minute Timeout Handling

export type TrackId =
  | 'green-hills'
  | 'city-nights'
  | 'sandy-desert'
  | 'wet-speed-way'
  | 'forest-ruins';

export interface TrackDefinition {
  id: TrackId;
  displayName: string;
  timeOfDay: 'day' | 'night';
  surface: 'dry' | 'sandy-dry' | 'wet';
  /** Relative grip multiplier applied to kart handling; 1.0 is the dry-asphalt baseline. */
  gripMultiplier: number;
}

export const TRACKS: readonly TrackDefinition[] = [
  { id: 'green-hills', displayName: 'Green Hills', timeOfDay: 'day', surface: 'dry', gripMultiplier: 1.0 },
  { id: 'city-nights', displayName: 'City Nights', timeOfDay: 'night', surface: 'dry', gripMultiplier: 1.0 },
  { id: 'sandy-desert', displayName: 'Sandy Desert', timeOfDay: 'day', surface: 'sandy-dry', gripMultiplier: 0.85 },
  { id: 'wet-speed-way', displayName: 'Wet Speed Way', timeOfDay: 'day', surface: 'wet', gripMultiplier: 0.7 },
  { id: 'forest-ruins', displayName: 'Forest Ruins', timeOfDay: 'day', surface: 'wet', gripMultiplier: 0.75 },
];

export interface KartDefinition {
  id: string;
  displayName: string;
  color: number;
}

export const KARTS: readonly KartDefinition[] = [
  { id: 'kart-sprinter', displayName: 'Sprinter', color: 0xff5c3d },
  { id: 'kart-tank', displayName: 'Tank', color: 0x3dbcff },
  { id: 'kart-glider', displayName: 'Glider', color: 0xffe14d },
  { id: 'kart-rocket', displayName: 'Rocket', color: 0x9b5cff },
];

export interface SessionPlayer {
  playerId: string;
  name: string;
  isHost: boolean;
  kartId: string | null;
  ready: boolean;
}

export interface SessionState {
  sessionId: string;
  players: SessionPlayer[];
  selectedTrackId: TrackId | null;
  /** True once every connected player is ready and the race has started. */
  raceStarted: boolean;
}

export interface KartInputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

export interface KartTransform {
  x: number;
  z: number;
  headingRadians: number;
  speed: number;
  /** Signed distance in meters from the track centerline, positive to the right. */
  lateralOffset: number;
}

export interface RaceProgress {
  lap: number; // 1-based, up to TOTAL_LAPS
  lapCompleted: boolean;
  raceFinished: boolean;
  timedOut: boolean;
  elapsedMs: number;
}

export interface RaceResultEntry {
  playerId: string;
  name: string;
  finalLap: number;
  totalTimeMs: number;
  timedOut: boolean;
}
