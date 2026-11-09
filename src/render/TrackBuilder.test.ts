import { describe, expect, it } from 'vitest';
import { pointOnTrack, rightVector } from './TrackBuilder';
import { TRACKS, type TrackId } from '../types';
import { TRACK_LAYOUTS, type Vec2 } from './trackLayouts';

describe('TrackBuilder: heading correctness (800ec5bb Change 1)', () => {
  it('headingRadians points along the actual direction of travel, not 90 degrees off it', () => {
    const sampleFractions = [0.05, 0.15, 0.27, 0.42, 0.55, 0.68, 0.81, 0.93];
    for (const track of TRACKS) {
      for (const fraction of sampleFractions) {
        const epsilon = 0.0005;
        const a = pointOnTrack(track.id, fraction);
        const b = pointOnTrack(track.id, fraction + epsilon);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1e-9) continue; // landed exactly on a vertex; skip this sample

        const travelDirX = dx / len;
        const travelDirZ = dz / len;
        const forwardX = Math.sin(a.headingRadians);
        const forwardZ = -Math.cos(a.headingRadians);
        const dot = travelDirX * forwardX + travelDirZ * forwardZ;

        expect(dot).toBeGreaterThan(0.99);
      }
    }
  });
});

describe('TrackBuilder: lap-fraction wraparound continuity (800ec5bb Change 4)', () => {
  it('produces a continuous position and heading across the 1.0 -> 0.0 wrap on every real track', () => {
    for (const track of TRACKS) {
      const justBefore = pointOnTrack(track.id, 0.9999);
      const atWrap = pointOnTrack(track.id, 1.0);
      const justAfter = pointOnTrack(track.id, 0.0001);

      const gapBefore = Math.hypot(atWrap.x - justBefore.x, atWrap.z - justBefore.z);
      const gapAfter = Math.hypot(justAfter.x - atWrap.x, justAfter.z - atWrap.z);
      expect(gapBefore).toBeLessThan(2);
      expect(gapAfter).toBeLessThan(2);
    }
  });
});

describe('TrackBuilder: fallback behaviour (800ec5bb Change 4)', () => {
  it('falls back to the perfect circle rather than crashing when a track has no path data', () => {
    const point = pointOnTrack('not-a-real-track' as TrackId, 0.25);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.z)).toBe(true);
    expect(Number.isFinite(point.headingRadians)).toBe(true);
  });
});

describe('rightVector', () => {
  it('is perpendicular to the forward direction implied by headingRadians', () => {
    for (const heading of [0, 0.5, 1.5, 3.1, 4.8, -2.2]) {
      const forwardX = Math.sin(heading);
      const forwardZ = -Math.cos(heading);
      const right = rightVector(heading);
      const dot = forwardX * right.x + forwardZ * right.z;
      expect(Math.abs(dot)).toBeLessThan(1e-9);
    }
  });
});

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
  const d1x = p2.x - p1.x;
  const d1z = p2.z - p1.z;
  const d2x = p4.x - p3.x;
  const d2z = p4.z - p3.z;
  const denom = cross(d1x, d1z, d2x, d2z);
  if (Math.abs(denom) < 1e-9) return false; // parallel or collinear: not treated as a crossing here
  const t = cross(p3.x - p1.x, p3.z - p1.z, d2x, d2z) / denom;
  const u = cross(p3.x - p1.x, p3.z - p1.z, d1x, d1z) / denom;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}

describe('TRACK_LAYOUTS: closed loops with no self-intersections (800ec5bb Change 4)', () => {
  it('each of the 5 real tracks forms a simple, non-self-intersecting closed loop', () => {
    for (const [trackId, points] of Object.entries(TRACK_LAYOUTS)) {
      const n = points.length;
      expect(n, `${trackId}: needs at least 3 points`).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < n; i += 1) {
        const a1 = points[i]!;
        const a2 = points[(i + 1) % n]!;
        for (let j = i + 1; j < n; j += 1) {
          if ((j + 1) % n === i) continue; // skip the wraparound-adjacent pair; shares an endpoint
          const b1 = points[j]!;
          const b2 = points[(j + 1) % n]!;
          expect(
            segmentsIntersect(a1, a2, b1, b2),
            `${trackId}: segments ${i} and ${j} intersect`,
          ).toBe(false);
        }
      }
    }
  });
});
