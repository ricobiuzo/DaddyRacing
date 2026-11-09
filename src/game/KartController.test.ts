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

describe('KartController (lateral steering)', () => {
  it('moves the kart laterally away from the centerline when steering', () => {
    const kart = new KartController(dryTrack);
    const steerRight = { accelerate: false, brake: false, steerLeft: false, steerRight: true };
    let lastOffset = 0;
    for (let i = 0; i < 10; i += 1) {
      lastOffset = kart.update(steerRight, 0.1).transform.lateralOffset;
    }
    expect(lastOffset).toBeGreaterThan(0);
  });

  it('steers left and right symmetrically', () => {
    const kartLeft = new KartController(dryTrack);
    const kartRight = new KartController(dryTrack);
    const steerLeft = { accelerate: false, brake: false, steerLeft: true, steerRight: false };
    const steerRight = { accelerate: false, brake: false, steerLeft: false, steerRight: true };
    let leftOffset = 0;
    let rightOffset = 0;
    for (let i = 0; i < 10; i += 1) {
      leftOffset = kartLeft.update(steerLeft, 0.1).transform.lateralOffset;
      rightOffset = kartRight.update(steerRight, 0.1).transform.lateralOffset;
    }
    expect(leftOffset).toBeCloseTo(-rightOffset, 5);
  });

  it('clamps lateralOffset at the verge limit under sustained steering, without exceeding it', () => {
    const kart = new KartController(dryTrack);
    const steerRight = { accelerate: false, brake: false, steerLeft: false, steerRight: true };
    let offset = 0;
    for (let i = 0; i < 500; i += 1) {
      offset = kart.update(steerRight, 0.1).transform.lateralOffset;
      expect(offset).toBeLessThanOrEqual(8);
    }
    expect(offset).toBeGreaterThan(7.9);
  });

  it('reduces achievable top speed once the kart drives off the paved road edge', () => {
    const steerRight = { accelerate: false, brake: false, steerLeft: false, steerRight: true };
    const accelerate = { accelerate: true, brake: false, steerLeft: false, steerRight: false };

    const offRoadKart = new KartController(dryTrack);
    for (let i = 0; i < 20; i += 1) offRoadKart.update(steerRight, 0.1); // push lateralOffset past the paved edge
    for (let i = 0; i < 30; i += 1) offRoadKart.update(accelerate, 1);
    const offRoadResult = offRoadKart.update(accelerate, 0);
    expect(Math.abs(offRoadResult.transform.lateralOffset)).toBeGreaterThan(5); // confirm still off-road

    const onRoadKart = new KartController(dryTrack);
    for (let i = 0; i < 30; i += 1) onRoadKart.update(accelerate, 1);
    const onRoadSpeed = onRoadKart.update(accelerate, 0).transform.speed;

    expect(offRoadResult.transform.speed).toBeLessThan(onRoadSpeed);
  });
});
