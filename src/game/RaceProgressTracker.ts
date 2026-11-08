import { RACE_TIMEOUT_MS, TOTAL_LAPS, type RaceProgress } from '../types';

/**
 * Client-side prediction of lap/finish/timeout state, implementing
 * `4188493d-34c3-41ec-8176-14199074fa03` (Count Completed Laps),
 * `3b346850-1051-4b57-9bfd-f101632f07e5` (Detect Race Completion at 5 Laps)
 * and `502f152d-be21-49f9-85e3-823335f18d5b` (End a Race After a 10-Minute
 * Timeout) for this client's own HUD/result display. The authoritative
 * versions of these Stories belong to the DaddyRacing Session Server
 * (Changes 22/23), which isn't implemented yet — this tracker lets the
 * Game Client show correct lap/timer/result behaviour standalone today, and
 * is the natural place to apply server corrections once that Application
 * exists.
 */
export class RaceProgressTracker {
  private lap = 1;
  private elapsedMs = 0;
  private finished = false;
  private timedOut = false;

  tick(deltaSeconds: number, lapCrossed: boolean): RaceProgress {
    if (!this.finished) {
      this.elapsedMs += deltaSeconds * 1000;

      let lapCompleted = false;
      if (lapCrossed && this.lap < TOTAL_LAPS) {
        this.lap += 1;
        lapCompleted = true;
      } else if (lapCrossed && this.lap === TOTAL_LAPS) {
        this.lap = TOTAL_LAPS;
        lapCompleted = true;
        this.finished = true;
      }

      if (!this.finished && this.elapsedMs >= RACE_TIMEOUT_MS) {
        this.finished = true;
        this.timedOut = true;
      }

      return {
        lap: this.lap,
        lapCompleted,
        raceFinished: this.finished,
        timedOut: this.timedOut,
        elapsedMs: this.elapsedMs,
      };
    }

    return {
      lap: this.lap,
      lapCompleted: false,
      raceFinished: this.finished,
      timedOut: this.timedOut,
      elapsedMs: this.elapsedMs,
    };
  }

  isFinished(): boolean {
    return this.finished;
  }
}
