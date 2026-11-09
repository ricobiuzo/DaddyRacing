import * as THREE from 'three';

/**
 * Builds a simple low-poly kart body for the local player's vehicle view
 * (`800ec5bb-...` Change 2): a box body, a cabin, and 4 wheels, colored from
 * the player's selected `KartDefinition.color`. Only the local player's own
 * kart is built; remote players are not rendered.
 */
export function buildKartMesh(color: number): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 2.4),
    new THREE.MeshStandardMaterial({ color }),
  );
  body.position.y = 0.35;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.4, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
  );
  cabin.position.set(0, 0.75, -0.2);
  group.add(cabin);

  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wheelOffsets: ReadonlyArray<readonly [number, number]> = [
    [-0.75, 0.9],
    [0.75, 0.9],
    [-0.75, -0.9],
    [0.75, -0.9],
  ];
  for (const [x, z] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.3, z);
    group.add(wheel);
  }

  return group;
}
