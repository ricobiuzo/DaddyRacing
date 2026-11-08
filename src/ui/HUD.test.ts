import { describe, expect, it } from 'vitest';
import { formatElapsed } from './HUD';

describe('formatElapsed (lap & timer HUD)', () => {
  it('formats sub-minute durations as 0:SS', () => {
    expect(formatElapsed(45_000)).toBe('0:45');
  });

  it('formats multi-minute durations as M:SS', () => {
    expect(formatElapsed(125_000)).toBe('2:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatElapsed(61_000)).toBe('1:01');
  });
});
