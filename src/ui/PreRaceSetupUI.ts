import { KARTS, TRACKS, type SessionState, type TrackId } from '../types';
import type { SessionTransport } from '../net/SessionTransport';

export interface PreRaceSetupCallbacks {
  onReadyToRace: () => void;
}

/**
 * The pre-race lobby screen. Covers four Changes that all share one view:
 * - `c20e5254-...` Session Player List (Change 1): the connected-player list.
 * - `2c5d4ccc-...` Kart Selection Screen (Change 2): every player picks a kart.
 * - `ce576c53-...` Track Selection Screen (Change 3): host-only track choice,
 *   read-only for everyone else.
 * - `54a9c46c-...` Player Ready/Start Confirmation (Change 4): ready toggle,
 *   gated on having a kart (and, for the host, a track) selected.
 */
export class PreRaceSetupUI {
  private readonly root: HTMLDivElement;
  private readonly playerListEl: HTMLUListElement;
  private readonly kartListEl: HTMLDivElement;
  private readonly trackListEl: HTMLDivElement;
  private readonly readyButton: HTMLButtonElement;
  private readonly statusEl: HTMLParagraphElement;

  private selfPlayerId: string | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    container: HTMLElement,
    private readonly transport: SessionTransport,
    private readonly callbacks: PreRaceSetupCallbacks,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'pre-race-setup';
    this.root.innerHTML = `
      <h1>DaddyRacing</h1>
      <section>
        <h2>Players</h2>
        <ul class="player-list"></ul>
      </section>
      <section>
        <h2>Choose your kart</h2>
        <div class="kart-list"></div>
      </section>
      <section>
        <h2>Track</h2>
        <div class="track-list"></div>
      </section>
      <p class="status"></p>
      <button class="ready-button" disabled>Ready</button>
    `;
    container.appendChild(this.root);

    this.playerListEl = this.root.querySelector('.player-list')!;
    this.kartListEl = this.root.querySelector('.kart-list')!;
    this.trackListEl = this.root.querySelector('.track-list')!;
    this.readyButton = this.root.querySelector('.ready-button')!;
    this.statusEl = this.root.querySelector('.status')!;

    this.readyButton.addEventListener('click', () => this.handleReadyClick());

    this.renderKartOptions();
    this.unsubscribe = transport.onStateChange((state) => this.render(state));
    const existing = transport.getState();
    if (existing) this.render(existing);
  }

  setSelfPlayerId(playerId: string): void {
    this.selfPlayerId = playerId;
  }

  destroy(): void {
    // Without this, the Session Server's ~20Hz state broadcast during a race
    // keeps calling this.render() on a lobby that's already gone, which calls
    // onReadyToRace() again every time — spawning a brand new RenderingEngine
    // (WebGL context + canvas) and InputHandler on every tick, without ever
    // disposing the previous ones. See the white-screen crash this caused.
    this.unsubscribe();
    this.root.remove();
  }

  private renderKartOptions(): void {
    this.kartListEl.innerHTML = '';
    for (const kart of KARTS) {
      const button = document.createElement('button');
      button.textContent = kart.displayName;
      button.style.borderColor = `#${kart.color.toString(16).padStart(6, '0')}`;
      button.addEventListener('click', async () => {
        await this.transport.selectKart(kart.id);
      });
      this.kartListEl.appendChild(button);
    }
  }

  private render(state: SessionState): void {
    // Session Player List (c20e5254-...)
    this.playerListEl.innerHTML = '';
    for (const player of state.players) {
      const li = document.createElement('li');
      li.textContent = `${player.name}${player.isHost ? ' (host)' : ''} — ${
        player.kartId ? 'kart selected' : 'choosing kart'
      } — ${player.ready ? 'ready' : 'not ready'}`;
      this.playerListEl.appendChild(li);
    }

    const self = state.players.find((p) => p.playerId === this.selfPlayerId);
    const isHost = self?.isHost ?? false;

    // Track Selection Screen (ce576c53-...): host picks, everyone else is read-only.
    this.trackListEl.innerHTML = '';
    for (const track of TRACKS) {
      const button = document.createElement('button');
      button.textContent = track.displayName;
      button.setAttribute('aria-pressed', String(state.selectedTrackId === track.id));
      if (isHost) {
        button.addEventListener('click', async () => {
          await this.transport.selectTrack(track.id);
        });
      } else {
        button.disabled = true;
      }
      this.trackListEl.appendChild(button);
    }
    if (!isHost) {
      const selected = TRACKS.find((t) => t.id === state.selectedTrackId);
      this.statusEl.textContent = selected
        ? `Host has selected: ${selected.displayName}`
        : 'Waiting for the host to select a track…';
    } else {
      this.statusEl.textContent = '';
    }

    // Player Ready/Start Confirmation (54a9c46c-...)
    const hasKart = Boolean(self?.kartId);
    const hasTrack = Boolean(state.selectedTrackId);
    const canReady = hasKart && (isHost ? hasTrack : true);
    this.readyButton.disabled = !canReady;
    this.readyButton.textContent = self?.ready ? 'Ready ✓' : 'Ready';

    if (state.raceStarted) {
      this.callbacks.onReadyToRace();
    }
  }

  private async handleReadyClick(): Promise<void> {
    const state = this.transport.getState();
    const self = state?.players.find((p) => p.playerId === this.selfPlayerId);
    await this.transport.setReady(!(self?.ready ?? false));
  }
}

export function trackIdExists(id: string): id is TrackId {
  return TRACKS.some((t) => t.id === id);
}
