import { describe, expect, it } from 'vitest';
import { RaceProgressTracker } from './RaceProgressTracker';
import { RACE_TIMEOUT_MS, TOTAL_LAPS } from '../types';

describe('RaceProgressTracker', () => {
  it('counts a completed lap exactly once per crossing', () => {
    const tracker = new RaceProgressTracker();
    const first = tracker.tick(1, false);
    expect(first.lap).toBe(1);
    const afterCrossing = tracker.tick(1, true);
    expect(afterCrossing.lap).toBe(2);
    expect(afterCrossing.lapCompleted).toBe(true);
  });

  it('finishes the race on completing the 5th lap', () => {
    const tracker = new RaceProgressTracker();
    let progress = tracker.tick(1, false);
    for (let lap = 1; lap < TOTAL_LAPS; lap += 1) {
      progress = tracker.tick(1, true);
    }
    expect(progress.lap).toBe(TOTAL_LAPS);
    expect(progress.raceFinished).toBe(false);
    progress = tracker.tick(1, true); // crossing the finish line on lap 5
    expect(progress.raceFinished).toBe(true);
    expect(progress.timedOut).toBe(false);
  });

  it('ends the race on the 10-minute timeout if not finished', () => {
    const tracker = new RaceProgressTracker();
    const progress = tracker.tick(RACE_TIMEOUT_MS / 1000 + 1, false);
    expect(progress.raceFinished).toBe(true);
    expect(progress.timedOut).toBe(true);
    expect(progress.lap).toBeLessThan(TOTAL_LAPS);
  });

  it('does not advance further once the race has finished', () => {
    const tracker = new RaceProgressTracker();
    tracker.tick(RACE_TIMEOUT_MS / 1000 + 1, false);
    expect(tracker.isFinished()).toBe(true);
    const elapsedBefore = tracker.tick(5, true).elapsedMs;
    const elapsedAfter = tracker.tick(5, true).elapsedMs;
    expect(elapsedAfter).toBe(elapsedBefore);
  });
});
