import * as THREE from 'three';
import type { TrackDefinition } from '../types';
import { visualStyleFor } from './visualStyle';

/**
 * Shared first-person 3D rendering pipeline reused across all 5 tracks.
 * Implements `568ce9d7-59d5-4581-bc84-0ae0261c8cae` (renders in first-person,
 * entirely in-browser, no plugin) and `45417acd-c9e1-4f2d-ad19-a64b1a66a771`
 * (sustains a playable frame rate) per the NFR "Rendering Frame Rate Across
 * Tracks" (`c495aece-ef2f-4d28-8e4d-b5985413a1c2`, now Microsoft Edge/Google
 * Chrome at 8GB+ RAM, target >= 30fps).
 */
export class RenderingEngine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private frameCallback: ((deltaSeconds: number) => void) | null = null;
  private lastFrameTime = performance.now();
  private running = false;

  constructor(container: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(90, container.clientWidth / container.clientHeight, 0.1, 500);
    // First-person, in-kart: camera sits low and close to the road.
    this.camera.position.set(0, 0.9, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(-50, 80, -50);
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    window.addEventListener('resize', () => this.handleResize(container));
  }

  applyTrackStyle(track: TrackDefinition): void {
    const style = visualStyleFor(track);
    this.sunLight.color.setHex(style.sunColor);
    this.sunLight.intensity = style.sunIntensity;
    this.ambientLight.intensity = style.ambientIntensity;
    this.scene.fog = new THREE.Fog(style.fogColor, style.fogNear, style.fogFar);
    this.scene.background = new THREE.Color(style.skyTop);
  }

  setFrameCallback(callback: (deltaSeconds: number) => void): void {
    this.frameCallback = callback;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      const delta = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;
      this.frameCallback?.(delta);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }

  private handleResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }
}
