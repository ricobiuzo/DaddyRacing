import type { SessionTransport } from '../net/SessionTransport';
import { SessionFullError, SessionNotFoundError } from '../net/SessionTransport';

/**
 * Supporting plumbing, not a Change of its own: a minimal screen to create
 * or join a session by identifier before the pre-race lobby loads. The
 * create/join behaviour itself (`a9372a31-...` Create/Join Race Session) is
 * a DaddyRacing Session Server Change (16); this view only calls the
 * SessionTransport methods that implement it.
 */
export class JoinScreen {
  private readonly root: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private readonly transport: SessionTransport,
    private readonly onJoined: (sessionId: string) => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'join-screen';
    this.root.innerHTML = `
      <h1>DaddyRacing</h1>
      <label>Your name <input class="player-name" value="Player" /></label>
      <button class="create-button">Create session</button>
      <hr />
      <label>Session code <input class="session-id" placeholder="e.g. AB12CD" /></label>
      <button class="join-button">Join session</button>
      <p class="error"></p>
    `;
    container.appendChild(this.root);

    this.root.querySelector('.create-button')!.addEventListener('click', () => this.handleCreate());
    this.root.querySelector('.join-button')!.addEventListener('click', () => this.handleJoin());
  }

  destroy(): void {
    this.root.remove();
  }

  private get playerName(): string {
    return (this.root.querySelector('.player-name') as HTMLInputElement).value.trim() || 'Player';
  }

  private setError(message: string): void {
    (this.root.querySelector('.error') as HTMLParagraphElement).textContent = message;
  }

  private async handleCreate(): Promise<void> {
    try {
      const state = await this.transport.createSession(this.playerName);
      this.onJoined(state.sessionId);
    } catch (error) {
      this.setError(String((error as Error).message ?? error));
    }
  }

  private async handleJoin(): Promise<void> {
    const sessionId = (this.root.querySelector('.session-id') as HTMLInputElement).value.trim().toUpperCase();
    try {
      const state = await this.transport.joinSession(sessionId, this.playerName);
      this.onJoined(state.sessionId);
    } catch (error) {
      if (error instanceof SessionFullError) {
        this.setError("This session is full — you weren't added.");
      } else if (error instanceof SessionNotFoundError) {
        this.setError('No session found with that code.');
      } else {
        this.setError(String((error as Error).message ?? error));
      }
    }
  }
}
