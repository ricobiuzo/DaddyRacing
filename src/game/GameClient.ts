import { MockSessionTransport } from '../net/MockSessionTransport';
import type { SessionTransport } from '../net/SessionTransport';
import { RenderingEngine } from '../render/RenderingEngine';
import { buildTrack } from '../render/TrackBuilder';
import { buildKartMesh } from '../render/KartMesh';
import { InputHandler } from '../input/InputHandler';
import { KartController } from './KartController';
import { RaceProgressTracker } from './RaceProgressTracker';
import { JoinScreen } from '../ui/JoinScreen';
import { PreRaceSetupUI } from '../ui/PreRaceSetupUI';
import { HUD } from '../ui/HUD';
import { RaceResult } from '../ui/RaceResult';
import { TRACKS, KARTS, type RaceResultEntry } from '../types';

// Vehicle-view chase camera offsets (`800ec5bb-...` Change 3); exact values are an
// implementation detail tuned visually, not specified numerically in the CR.
const CHASE_DISTANCE = 6;
const CHASE_HEIGHT = 2.5;

/**
 * Orchestrates the full client-side flow across all 15 Changes in this CR
 * for the DaddyRacing Game Client: join/create session, pre-race setup,
 * the race itself, and the result screen.
 */
export class GameClient {
  private readonly transport: SessionTransport;
  private readonly container: HTMLElement;

  constructor(container: HTMLElement, transport: SessionTransport = new MockSessionTransport()) {
    this.container = container;
    this.transport = transport;
  }

  start(): void {
    const joinScreen = new JoinScreen(this.container, this.transport, () => {
      const state = this.transport.getState();
      // The transport always appends the local player last on both create
      // and join, so the last entry is "self" for this client.
      const self = state?.players[state.players.length - 1];
      if (!self) return;
      joinScreen.destroy();
      this.showLobby(self.playerId);
    });
  }

  private showLobby(selfPlayerId: string): void {
    const lobby = new PreRaceSetupUI(this.container, this.transport, {
      onReadyToRace: () => {
        lobby.destroy();
        this.runRace();
      },
    });
    lobby.setSelfPlayerId(selfPlayerId);
  }

  private runRace(): void {
    const state = this.transport.getState();
    const trackId = state?.selectedTrackId;
    const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0]!;

    // Same "last entry is self" convention used in start() above.
    const self = state?.players[state.players.length - 1];
    const kartColor = KARTS.find((k) => k.id === self?.kartId)?.color ?? KARTS[0]!.color;

    const engine = new RenderingEngine(this.container);
    engine.applyTrackStyle(track);
    buildTrack(engine.scene, track);

    const kartMesh = buildKartMesh(kartColor);
    engine.scene.add(kartMesh);

    const input = new InputHandler();
    input.attach();

    const kart = new KartController(track);
    const progress = new RaceProgressTracker();
    const hud = new HUD(this.container);

    engine.setFrameCallback((delta) => {
      const { transform, lapCrossed } = kart.update(input.getState(), delta);

      kartMesh.position.set(transform.x, 0, transform.z);
      kartMesh.rotation.y = -transform.headingRadians;

      // World forward vector implied by the camera's rotation convention below.
      const forwardX = Math.sin(transform.headingRadians);
      const forwardZ = -Math.cos(transform.headingRadians);
      engine.camera.position.set(
        transform.x - forwardX * CHASE_DISTANCE,
        CHASE_HEIGHT,
        transform.z - forwardZ * CHASE_DISTANCE,
      );
      engine.camera.rotation.set(0, -transform.headingRadians, 0);

      const raceProgress = progress.tick(delta, lapCrossed);
      hud.update(raceProgress);

      if (raceProgress.raceFinished) {
        engine.stop();
        input.detach();
        hud.destroy();
        engine.dispose();
        this.showResult(state, raceProgress.lap, raceProgress.elapsedMs, raceProgress.timedOut);
      }
    });

    engine.start();
  }

  private showResult(
    state: ReturnType<SessionTransport['getState']>,
    finalLap: number,
    totalTimeMs: number,
    timedOut: boolean,
  ): void {
    const entries: RaceResultEntry[] = (state?.players ?? []).map((player) => ({
      playerId: player.playerId,
      name: player.name,
      finalLap,
      totalTimeMs,
      timedOut,
    }));
    new RaceResult(this.container, entries);
  }
}
