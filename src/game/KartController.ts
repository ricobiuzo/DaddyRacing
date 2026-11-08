import { pointOnTrack } from '../render/TrackBuilder';
import type { KartInputState, KartTransform, TrackDefinition } from '../types';

const MAX_SPEED = 28; // m/s
const ACCELERATION = 18; // m/s^2
const BRAKE_DECELERATION = 32; // m/s^2
const COAST_DECELERATION = 6; // m/s^2
const STEER_RATE = 1.6; // radians/sec of lap-fraction turn, scaled by speed below
const LAP_LENGTH_METERS = 400;

/**
 * Implements `d34109e8-de87-4b9f-aabe-f41ed00c6641` (Accelerate and Brake)
 * and `cf870843-2966-45de-b3f1-fd1ccf3d048f` (Steer the Kart on Track):
 * local, client-side prediction of kart movement from arrow-key input, per
 * the project's assumption that sync uses "client-side prediction and
 * server reconciliation." There is no server yet to reconcile against
 * (DaddyRacing Session Server is a separate, not-yet-implemented
 * Application), so this is the full predicted transform for now; a future
 * Session Server integration can correct `lapFraction`/`speed` from
 * authoritative updates without changing this class's public shape.
 */
export class KartController {
  private lapFraction = 0; // 0..1 around the oval; wraps on lap completion
  private speed = 0;
  private gripMultiplier: number;

  constructor(track: TrackDefinition) {
    this.gripMultiplier = track.gripMultiplier;
  }

  setTrack(track: TrackDefinition): void {
    this.gripMultiplier = track.gripMultiplier;
  }

  /** Advances the simulation by `deltaSeconds` given the current input; returns true if a lap boundary was crossed. */
  update(input: KartInputState, deltaSeconds: number): { transform: KartTransform; lapCrossed: boolean } {
    if (input.accelerate) {
      this.speed += ACCELERATION * this.gripMultiplier * deltaSeconds;
    } else if (input.brake) {
      this.speed -= BRAKE_DECELERATION * deltaSeconds;
    } else {
      this.speed -= COAST_DECELERATION * deltaSeconds;
    }
    this.speed = clamp(this.speed, 0, MAX_SPEED * this.gripMultiplier);

    let steer = 0;
    if (input.steerLeft) steer -= 1;
    if (input.steerRight) steer += 1;
    const speedFraction = this.speed / MAX_SPEED;
    const fractionDelta =
      ((this.speed * deltaSeconds) / LAP_LENGTH_METERS) * (1 + steer * STEER_RATE * speedFraction * 0.15);

    const before = this.lapFraction;
    this.lapFraction = (this.lapFraction + fractionDelta) % 1;
    const lapCrossed = fractionDelta > 0 && this.lapFraction < before;

    const { x, z, headingRadians } = pointOnTrack(this.lapFraction);
    return {
      transform: { x, z, headingRadians, speed: this.speed },
      lapCrossed,
    };
  }

  getLapFraction(): number {
    return this.lapFraction;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
