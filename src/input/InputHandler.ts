import type { KartInputState } from '../types';

/**
 * Implements `322da0d7-147b-4b52-99c7-1159d4c86054` (Control the Kart with
 * Arrow Keys) and NFR `7a1ebe6a-d664-454d-9469-ed578bd095aa` (Keyboard-Only
 * Usability): arrow keys are the sole input, read continuously via held-key
 * state rather than discrete keypress events, per the acceptance criteria.
 */
export class InputHandler {
  private state: KartInputState = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
  };

  private readonly onKeyDown = (event: KeyboardEvent) => this.setKey(event.key, true);
  private readonly onKeyUp = (event: KeyboardEvent) => this.setKey(event.key, false);

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  getState(): KartInputState {
    return { ...this.state };
  }

  private setKey(key: string, pressed: boolean): void {
    switch (key) {
      case 'ArrowUp':
        this.state.accelerate = pressed;
        break;
      case 'ArrowDown':
        this.state.brake = pressed;
        break;
      case 'ArrowLeft':
        this.state.steerLeft = pressed;
        break;
      case 'ArrowRight':
        this.state.steerRight = pressed;
        break;
      default:
        break;
    }
  }
}
