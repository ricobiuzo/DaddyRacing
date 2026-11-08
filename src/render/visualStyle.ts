import type { TrackDefinition } from '../types';

/**
 * Implements the Out Run-inspired visual treatment documented in
 * docs/OUT_RUN_VISUAL_STYLE_GUIDE.md (`7a48cffe-2523-4de3-800c-47fac70ce675`).
 * Every track reads from this same palette/lighting shape, varying only by
 * timeOfDay/surface, per the style guide's "per-track variation" table.
 */
export interface VisualStyle {
  skyTop: number;
  skyHorizon: number;
  roadColor: number;
  roadEdgeStripeA: number;
  roadEdgeStripeB: number;
  groundColor: number;
  sunColor: number;
  sunIntensity: number;
  ambientIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
}

const GROUND_BY_SURFACE: Record<TrackDefinition['surface'], number> = {
  dry: 0x4caf50,
  'sandy-dry': 0xc2a14d,
  wet: 0x355e3b,
};

export function visualStyleFor(track: TrackDefinition): VisualStyle {
  const isNight = track.timeOfDay === 'night';
  return {
    skyTop: isNight ? 0x0d1b4c : 0x4fc3f7,
    skyHorizon: isNight ? 0xff7a59 : 0xffe08a,
    roadColor: 0x3a3a3a,
    roadEdgeStripeA: 0xffffff,
    roadEdgeStripeB: 0xff5c3d,
    groundColor: GROUND_BY_SURFACE[track.surface],
    sunColor: isNight ? 0x88aaff : 0xffe08a,
    sunIntensity: isNight ? 0.25 : 1.0,
    ambientIntensity: isNight ? 0.35 : 0.6,
    fogColor: isNight ? 0x0d1b4c : 0x4fc3f7,
    fogNear: 40,
    fogFar: 220,
  };
}
