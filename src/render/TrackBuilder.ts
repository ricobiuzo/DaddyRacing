import * as THREE from 'three';
import type { TrackDefinition } from '../types';
import { visualStyleFor } from './visualStyle';

export const LAP_LENGTH_METERS = 400;
const ROAD_WIDTH = 10;
const ROAD_RADIUS = LAP_LENGTH_METERS / (2 * Math.PI);

/**
 * Builds the shared oval-circuit geometry used by all 5 tracks
 * (`661c698f-...`, `c34d22c4-...`, `eda522ef-...`, `44a55d29-...`,
 * `d7a630bf-...`), styled per `visualStyleFor(track)`. Each track differs
 * only by its TrackDefinition (time of day / surface), per the Out Run
 * style guide's "per-track variation" rule — there is deliberately no
 * per-track geometry fork.
 */
export function buildTrack(scene: THREE.Scene, track: TrackDefinition): THREE.Group {
  const group = new THREE.Group();
  const style = visualStyleFor(track);

  const roadGeometry = new THREE.RingGeometry(ROAD_RADIUS - ROAD_WIDTH / 2, ROAD_RADIUS + ROAD_WIDTH / 2, 64);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: style.roadColor,
    roughness: track.surface === 'wet' ? 0.2 : 0.9,
    metalness: track.surface === 'wet' ? 0.3 : 0,
  });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  group.add(road);

  const groundGeometry = new THREE.CircleGeometry(ROAD_RADIUS * 3, 64);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: style.groundColor });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  group.add(ground);

  const stripeCount = 48;
  for (let i = 0; i < stripeCount; i += 1) {
    const angle = (i / stripeCount) * Math.PI * 2;
    const color = i % 2 === 0 ? style.roadEdgeStripeA : style.roadEdgeStripeB;
    for (const radius of [ROAD_RADIUS - ROAD_WIDTH / 2, ROAD_RADIUS + ROAD_WIDTH / 2]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 1.2),
        new THREE.MeshBasicMaterial({ color }),
      );
      stripe.position.set(Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius);
      stripe.rotation.y = angle;
      group.add(stripe);
    }
  }

  scene.add(group);
  return group;
}

/** The kart's forward-facing position on the oval, by lap fraction in [0, 1). */
export function pointOnTrack(fraction: number): { x: number; z: number; headingRadians: number } {
  const angle = fraction * Math.PI * 2;
  return {
    x: Math.cos(angle) * ROAD_RADIUS,
    z: Math.sin(angle) * ROAD_RADIUS,
    headingRadians: angle + Math.PI / 2,
  };
}
