import * as THREE from 'three';
import type { TrackDefinition, TrackId } from '../types';
import { visualStyleFor } from './visualStyle';
import { TRACK_LAYOUTS, type Vec2 } from './trackLayouts';

export const LAP_LENGTH_METERS = 400;
export const ROAD_WIDTH = 10;
const ROAD_RADIUS = LAP_LENGTH_METERS / (2 * Math.PI);

interface CompiledPath {
  points: Vec2[];
  /** Cumulative path length through the end of segment i (points[i] -> points[i+1]). */
  cumulative: number[];
  total: number;
}

function fallbackCirclePoints(): Vec2[] {
  const segments = 128;
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({ x: Math.cos(angle) * ROAD_RADIUS, z: Math.sin(angle) * ROAD_RADIUS });
  }
  return points;
}

/** Returns null for path data that's missing, too short, or has a degenerate (zero-length) segment. */
function compilePath(points: Vec2[] | undefined): CompiledPath | null {
  if (!points || points.length < 3) return null;
  const cumulative: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const segmentLength = Math.hypot(b.x - a.x, b.z - a.z);
    if (!Number.isFinite(segmentLength) || segmentLength <= 0) return null;
    total += segmentLength;
    cumulative.push(total);
  }
  if (!Number.isFinite(total) || total <= 0) return null;
  return { points, cumulative, total };
}

const FALLBACK_PATH: CompiledPath = compilePath(fallbackCirclePoints())!;
const compiledPathCache = new Map<TrackId, CompiledPath>();

/** Falls back to the perfect-circle path if this track's layout data is malformed or empty. */
function getCompiledPath(trackId: TrackId): CompiledPath {
  const cached = compiledPathCache.get(trackId);
  if (cached) return cached;
  const compiled = compilePath(TRACK_LAYOUTS[trackId]) ?? FALLBACK_PATH;
  compiledPathCache.set(trackId, compiled);
  return compiled;
}

/**
 * Builds the per-track road geometry: a ribbon of quads following the
 * track's mapped reference-circuit path (`800ec5bb-...` Change 4), styled
 * per `visualStyleFor(track)`.
 */
export function buildTrack(scene: THREE.Scene, track: TrackDefinition): THREE.Group {
  const group = new THREE.Group();
  const style = visualStyleFor(track);
  const path = getCompiledPath(track.id);
  const points = path.points;
  const pointCount = points.length;

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: style.roadColor,
    roughness: track.surface === 'wet' ? 0.2 : 0.9,
    metalness: track.surface === 'wet' ? 0.3 : 0,
    side: THREE.DoubleSide,
  });

  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < pointCount; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % pointCount]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz) || 1;
    const nx = (-dz / segLen) * (ROAD_WIDTH / 2);
    const nz = (dx / segLen) * (ROAD_WIDTH / 2);

    const baseIndex = positions.length / 3;
    positions.push(a.x - nx, 0, a.z - nz);
    positions.push(a.x + nx, 0, a.z + nz);
    positions.push(b.x - nx, 0, b.z - nz);
    positions.push(b.x + nx, 0, b.z + nz);
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 1, baseIndex + 3, baseIndex + 2);
  }
  const roadGeometry = new THREE.BufferGeometry();
  roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeometry.setIndex(indices);
  roadGeometry.computeVertexNormals();
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  group.add(road);

  const groundGeometry = new THREE.CircleGeometry(ROAD_RADIUS * 3, 64);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: style.groundColor });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  group.add(ground);

  for (let i = 0; i < pointCount; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % pointCount]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz) || 1;
    const nx = (-dz / segLen) * (ROAD_WIDTH / 2);
    const nz = (dx / segLen) * (ROAD_WIDTH / 2);
    const angle = Math.atan2(dx, dz);
    const color = i % 2 === 0 ? style.roadEdgeStripeA : style.roadEdgeStripeB;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    for (const [ox, oz] of [[nx, nz], [-nx, -nz]] as const) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 1.2),
        new THREE.MeshBasicMaterial({ color }),
      );
      stripe.position.set(midX + ox, 0.03, midZ + oz);
      stripe.rotation.y = angle;
      group.add(stripe);
    }
  }

  scene.add(group);
  return group;
}

/**
 * The kart's centerline position and direction-of-travel heading on `trackId`,
 * by lap fraction in [0, 1). Heading is tangent to the path at that point
 * (`800ec5bb-...` Change 1 fixes this to match the actual direction of
 * travel, previously 90 degrees off; Change 4 generalises it from a fixed
 * circle to each track's own path).
 */
export function pointOnTrack(trackId: TrackId, fraction: number): { x: number; z: number; headingRadians: number } {
  const path = getCompiledPath(trackId);
  const wrapped = ((fraction % 1) + 1) % 1;
  const target = wrapped * path.total;

  let segmentIndex = 0;
  while (segmentIndex < path.cumulative.length - 1 && path.cumulative[segmentIndex]! < target) {
    segmentIndex += 1;
  }
  const segmentStart = segmentIndex === 0 ? 0 : path.cumulative[segmentIndex - 1]!;
  const segmentLength = path.cumulative[segmentIndex]! - segmentStart;
  const t = segmentLength > 0 ? (target - segmentStart) / segmentLength : 0;

  const a = path.points[segmentIndex]!;
  const b = path.points[(segmentIndex + 1) % path.points.length]!;
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const segLen = Math.hypot(dx, dz) || 1;
  // World forward vector implied by GameClient's camera.rotation.set(0, -headingRadians, 0)
  // is (sin(heading), -cos(heading)); solving for heading given a direction (dx, dz) gives
  // atan2(dx, -dz). This generalises cleanly to any path shape, not just the old circle.
  const headingRadians = Math.atan2(dx / segLen, -(dz / segLen));

  return { x, z, headingRadians };
}

/**
 * Unit vector perpendicular to `headingRadians`, pointing to the vehicle's
 * right. Used to offset a kart sideways from the centerline (`800ec5bb-...`
 * Change 5: real lateral steering). Orthogonal to the forward direction
 * implied by `headingRadians` for any heading value and any track shape.
 */
export function rightVector(headingRadians: number): { x: number; z: number } {
  return { x: Math.cos(headingRadians), z: Math.sin(headingRadians) };
}
