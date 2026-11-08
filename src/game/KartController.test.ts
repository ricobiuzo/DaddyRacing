import { describe, expect, it } from 'vitest';
import { KartController } from './KartController';
import { TRACKS } from '../types';

const dryTrack = TRACKS.find((t) => t.id === 'green-hills')!;
const wetTrack = TRACKS.find((t) => t.id === 'wet-speed-way')!;

describe('KartController (Accelerate/Brake/Steer)', () => {
  it('accelerates when the accelerate input is held', () => {
    const kart = new KartController(dryTrack);
    const noInput = { accelerate: false, brake: false, steerLeft: false, steerRight: false };
    const { transform: before } = kart.update(noInput, 1);
    const { transform: after } = kart.update(
      { accelerate: true, brake: false, steerLeft: false, steerRight: false },
      1,
    );
    expect(after.speed).toBeGreaterThan(before.speed);
  });

  it('decelerates faster when braking than when coasting', () => {
    const accelerating = { accelerate: true, brake: false, steerLeft: false, steerRight: false };
    const braking = { accelerate: false, brake: true, steerLeft: false, steerRight: false };
    const coasting = { accelerate: false, brake: false, steerLeft: false, steerRight: false };

    const brakingKart = new KartController(dryTrack);
    for (let i = 0; i < 10; i += 1) brakingKart.update(accelerating, 1);
    const afterBrake = brakingKart.update(braking, 0.5).transform.speed;

    const coastingKart = new KartController(dryTrack);
    for (let i = 0; i < 10; i += 1) coastingKart.update(accelerating, 1);
    const afterCoast = coastingKart.update(coasting, 0.5).transform.speed;

    expect(afterBrake).toBeLessThan(afterCoast);
  });

  it('reduces effective top speed on a wet, low-grip track', () => {
    const accelerating = { accelerate: true, brake: false, steerLeft: false, steerRight: false };

    const dryKart = new KartController(dryTrack);
    for (let i = 0; i < 20; i += 1) dryKart.update(accelerating, 1);

    const wetKart = new KartController(wetTrack);
    for (let i = 0; i < 20; i += 1) wetKart.update(accelerating, 1);

    expect(wetKart.update(accelerating, 0).transform.speed).toBeLessThan(
      dryKart.update(accelerating, 0).transform.speed,
    );
  });

  it('reports a lap crossing when the lap fraction wraps around', () => {
    const kart = new KartController(dryTrack);
    const accelerating = { accelerate: true, brake: false, steerLeft: false, steerRight: false };
    let crossed = false;
    for (let i = 0; i < 200 && !crossed; i += 1) {
      crossed = kart.update(accelerating, 1).lapCrossed;
    }
    expect(crossed).toBe(true);
  });
});
