import type { TrackId } from '../types';

export interface Vec2 {
  x: number;
  z: number;
}

/**
 * Per-track road-centerline path points, in closed-loop order (last point
 * implicitly connects back to the first). Stylised digitisations of each
 * track's mapped reference circuit from the "Race Tracks Mapping" Artefact
 * (`ab549b8b-d2f6-479e-8afa-247ea0bc852b`, sourced from `racing-circuit-maps.jpg`
 * in the DaddyRacingServer repo) — approximate silhouettes, not
 * precision-surveyed circuit data (`800ec5bb-...` Change 4; exact digitisation
 * fidelity is explicitly left to developer discretion in the CR).
 *
 * Point count/spacing doesn't need to match the real circuit's physical
 * dimensions: lap-fraction progression is driven entirely by
 * `KartController`'s speed integration (see `TrackBuilder.pointOnTrack`), not
 * by this path's own length, so any closed, non-self-intersecting polyline
 * works regardless of scale.
 */
export const TRACK_LAYOUTS: Record<TrackId, Vec2[]> = {
  // Green Hills -> Brands Hatch: rounded teardrop loop with a hook at the bottom.
  'green-hills': [
    { x: -10, z: 65 },
    { x: -45, z: 55 },
    { x: -65, z: 20 },
    { x: -60, z: -15 },
    { x: -35, z: -40 },
    { x: -5, z: -35 },
    { x: 10, z: -50 },
    { x: 35, z: -55 },
    { x: 50, z: -35 },
    { x: 35, z: -15 },
    { x: 45, z: 10 },
    { x: 25, z: 35 },
    { x: 10, z: 55 },
  ],
  // City Nights -> Oschersleben: stadium layout with a zigzag chicane and a long back straight.
  'city-nights': [
    { x: -70, z: 10 },
    { x: -60, z: 30 },
    { x: -45, z: 25 },
    { x: -40, z: 10 },
    { x: -50, z: -5 },
    { x: -35, z: -20 },
    { x: -10, z: -15 },
    { x: 20, z: 5 },
    { x: 55, z: 10 },
    { x: 70, z: -5 },
    { x: 65, z: -30 },
    { x: 20, z: -35 },
    { x: -30, z: -30 },
    { x: -60, z: -15 },
  ],
  // Sandy Desert -> Vallelunga: "lollipop" shape, narrow entry stem into a wide loop.
  'sandy-desert': [
    { x: 0, z: -70 },
    { x: 10, z: -55 },
    { x: 5, z: -45 },
    { x: 15, z: -35 },
    { x: 10, z: -25 },
    { x: 0, z: -20 },
    { x: 25, z: 0 },
    { x: 55, z: 15 },
    { x: 65, z: 45 },
    { x: 40, z: 65 },
    { x: 0, z: 60 },
    { x: -30, z: 40 },
    { x: -35, z: 10 },
    { x: -15, z: -15 },
    { x: -5, z: -40 },
  ],
  // Wet Speed Way -> Porto: angular trapezoid with a long diagonal straight.
  'wet-speed-way': [
    { x: -60, z: 50 },
    { x: -10, z: 65 },
    { x: 55, z: 30 },
    { x: 65, z: 5 },
    { x: 30, z: -10 },
    { x: 45, z: -35 },
    { x: 20, z: -55 },
    { x: -20, z: -45 },
    { x: -45, z: -55 },
    { x: -65, z: -30 },
    { x: -55, z: 0 },
  ],
  // Forest Ruins -> Valencia: elongated loop with a tight hairpin cluster at one end.
  // The cluster (points 5-10) descends in strictly decreasing z so its zigzag can't
  // cross itself; the return path (10-14) stays below that z range entirely.
  'forest-ruins': [
    { x: -70, z: 10 },
    { x: -55, z: 30 },
    { x: -20, z: 25 },
    { x: 10, z: 35 },
    { x: 40, z: 30 },
    { x: 55, z: 10 },
    { x: 65, z: -5 },
    { x: 45, z: -15 },
    { x: 65, z: -25 },
    { x: 45, z: -35 },
    { x: 65, z: -45 },
    { x: 35, z: -40 },
    { x: 10, z: -25 },
    { x: -20, z: -20 },
    { x: -50, z: -15 },
  ],
};
