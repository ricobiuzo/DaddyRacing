import { pointOnTrack, rightVector, ROAD_WIDTH } from '../render/TrackBuilder';
import type { KartInputState, KartTransform, TrackDefinition, TrackId } from '../types';

const MAX_SPEED = 28; // m/s
const ACCELERATION = 18; // m/s^2
const BRAKE_DECELERATION = 32; // m/s^2
const COAST_DECELERATION = 6; // m/s^2
const LAP_LENGTH_METERS = 400;

const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 5
const VERGE_WIDTH = 3; // extra off-road margin before the hard limit
const LATERAL_LIMIT = ROAD_HALF_WIDTH + VERGE_WIDTH; // 8
const LATERAL_ACCEL = 10; // m/s^2 of lateral acceleration from steering input
const LATERAL_DAMPING = 4; // 1/s decay toward centered lateral velocity when not steering
const MAX_LATERAL_SPEED = 6; // m/s
const OFFROAD_GRIP_PENALTY = 0.4; // multiplier on grip once past the paved road's edge

/**
 * Implements `d34109e8-de87-4b9f-aabe-f41ed00c6641` (Accelerate and Brake)
 * and `cf870843-2966-45de-b3f1-fd1ccf3d048f` (Steer the Kart on Track):
 * local, client-side prediction of kart movement from arrow-key input, per
 * the project's assumption that sync uses "client-side prediction and
 * server reconciliation." There is no server reconciliation for this yet
 * (DaddyRacing Session Server's physics model doesn't represent real track
 * geometry or lateral position), so this is the full predicted transform.
 *
 * Steering (`800ec5bb-...` Change 5) moves the kart laterally across the
 * road's width, independent of forward progress; it no longer changes lap
 * speed the way it used to. Driving off the paved surface (beyond
 * `ROAD_WIDTH / 2`) applies a grip penalty to both forward speed and lateral
 * responsiveness, modelling the verge.
 */
export class KartController {
  private lapFraction = 0; // 0..1 around the track; wraps on lap completion
  private speed = 0;
  private lateralOffset = 0; // meters from centerline, +ve to the right
  private lateralVelocity = 0;
  private gripMultiplier: number;
  private trackId: TrackId;

  constructor(track: TrackDefinition) {
    this.gripMultiplier = track.gripMultiplier;
    this.trackId = track.id;
  }

  setTrack(track: TrackDefinition): void {
    this.gripMultiplier = track.gripMultiplier;
    this.trackId = track.id;
  }

  /** Advances the simulation by `deltaSeconds` given the current input; returns true if a lap boundary was crossed. */
  update(input: KartInputState, deltaSeconds: number): { transform: KartTransform; lapCrossed: boolean } {
    const offRoad = Math.abs(this.lateralOffset) > ROAD_HALF_WIDTH;
    const effectiveGrip = this.gripMultiplier * (offRoad ? OFFROAD_GRIP_PENALTY : 1);

    if (input.accelerate) {
      this.speed += ACCELERATION * effectiveGrip * deltaSeconds;
    } else if (input.brake) {
      this.speed -= BRAKE_DECELERATION * deltaSeconds;
    } else {
      this.speed -= COAST_DECELERATION * deltaSeconds;
    }
    this.speed = clamp(this.speed, 0, MAX_SPEED * effectiveGrip);

    let steer = 0;
    if (input.steerLeft) steer -= 1;
    if (input.steerRight) steer += 1;

    if (steer !== 0) {
      this.lateralVelocity += steer * LATERAL_ACCEL * effectiveGrip * deltaSeconds;
    } else {
      // Self-centering: lateral velocity decays toward 0 when not actively steering.
      const decay = Math.min(1, LATERAL_DAMPING * deltaSeconds);
      this.lateralVelocity *= 1 - decay;
    }
    this.lateralVelocity = clamp(this.lateralVelocity, -MAX_LATERAL_SPEED, MAX_LATERAL_SPEED);

    this.lateralOffset += this.lateralVelocity * deltaSeconds;
    if (Math.abs(this.lateralOffset) > LATERAL_LIMIT) {
      this.lateralOffset = clamp(this.lateralOffset, -LATERAL_LIMIT, LATERAL_LIMIT);
      this.lateralVelocity = 0;
    }

    const fractionDelta = (this.speed * deltaSeconds) / LAP_LENGTH_METERS;

    const before = this.lapFraction;
    this.lapFraction = (this.lapFraction + fractionDelta) % 1;
    const lapCrossed = fractionDelta > 0 && this.lapFraction < before;

    const center = pointOnTrack(this.trackId, this.lapFraction);
    const right = rightVector(center.headingRadians);
    return {
      transform: {
        x: center.x + right.x * this.lateralOffset,
        z: center.z + right.z * this.lateralOffset,
        headingRadians: center.headingRadians,
        speed: this.speed,
        lateralOffset: this.lateralOffset,
      },
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
