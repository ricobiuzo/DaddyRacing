import { formatElapsed } from './HUD';
import type { RaceResultEntry } from '../types';

/**
 * Implements `b1ff0703-689e-4a6e-a732-2227e04f311f` (View the Race Result):
 * shows final lap count and total time, distinguishing a normal finish from
 * a 10-minute timeout, for every player in the session.
 */
export class RaceResult {
  private readonly root: HTMLDivElement;

  constructor(container: HTMLElement, entries: RaceResultEntry[]) {
    this.root = document.createElement('div');
    this.root.className = 'race-result';
    const rows = entries
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.name)}</td>
            <td>${entry.finalLap}</td>
            <td>${formatElapsed(entry.totalTimeMs)}</td>
            <td>${entry.timedOut ? 'Timed out (10 min)' : 'Finished'}</td>
          </tr>`,
      )
      .join('');
    this.root.innerHTML = `
      <h1>Race Result</h1>
      <table>
        <thead><tr><th>Player</th><th>Lap</th><th>Time</th><th>Outcome</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    container.appendChild(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
