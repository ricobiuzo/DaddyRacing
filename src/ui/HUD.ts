import { TOTAL_LAPS, type RaceProgress } from '../types';

/**
 * Implements `f67e9e1d-a7b0-48ca-ba93-1415f8e7c1aa` (View Current Lap and
 * Race Timer): shows lap-out-of-5 and the race timer, updated every tick
 * (well within the 1-second acceptance-criteria budget since it's driven
 * by the render loop).
 */
export class HUD {
  private readonly root: HTMLDivElement;
  private readonly lapEl: HTMLSpanElement;
  private readonly timerEl: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <span class="hud-lap"></span>
      <span class="hud-timer"></span>
    `;
    container.appendChild(this.root);
    this.lapEl = this.root.querySelector('.hud-lap')!;
    this.timerEl = this.root.querySelector('.hud-timer')!;
  }

  update(progress: RaceProgress): void {
    this.lapEl.textContent = `Lap ${progress.lap}/${TOTAL_LAPS}`;
    this.timerEl.textContent = formatElapsed(progress.elapsedMs);
  }

  destroy(): void {
    this.root.remove();
  }
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
