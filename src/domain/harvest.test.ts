import { describe, it, expect } from 'vitest';
import { initHarvest, tickHarvest, progress, T_MIN } from './harvest';

describe('initHarvest', () => {
  it('X 始终为整数且 ≥ 1，D 始终 ≥ T_MIN', () => {
    const rates = [0.0001, 0.001, 0.5, 0.951, 1.9, 6.34, 31.7, 1000];
    for (const r of rates) {
      const s = initHarvest(r);
      expect(Number.isInteger(s.X)).toBe(true);
      expect(s.X).toBeGreaterThanOrEqual(1);
      expect(s.D).toBeGreaterThanOrEqual(T_MIN - 1e-9);
    }
  });

  it('慢速率：X=1，周期 > 1s', () => {
    const s = initHarvest(0.001); // 每秒 0.001
    expect(s.X).toBe(1);
    expect(s.D).toBeCloseTo(1000, 5);
  });

  it('快速率：X>1，周期 ≈ 1s', () => {
    const s = initHarvest(6.34); // ceil(6.34*1)=7
    expect(s.X).toBe(7);
    expect(s.D).toBeCloseTo(7 / 6.34, 5);
    expect(s.D).toBeGreaterThanOrEqual(T_MIN);
  });

  it('r <= 0 或非有限：不产出（D=Infinity）', () => {
    for (const r of [0, -5, NaN, Infinity]) {
      const s = initHarvest(r);
      expect(s.X).toBe(1);
      expect(s.D).toBe(Infinity);
    }
  });
});

describe('progress', () => {
  it('返回 0..1', () => {
    const s = initHarvest(2); // X=2, D=1
    expect(progress(s)).toBe(0);
    s.elapsed = 0.5;
    expect(progress(s)).toBeCloseTo(0.5, 6);
    s.elapsed = 2; // 超出也夹到 1
    expect(progress(s)).toBe(1);
  });

  it('不产出时进度恒为 0', () => {
    expect(progress(initHarvest(0))).toBe(0);
  });
});

describe('tickHarvest', () => {
  it('频率上限：相邻两次收成间隔 ≥ 1s', () => {
    const s = initHarvest(50); // 很快
    const times: number[] = [];
    let t = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 5; i++) {
      t += dt;
      tickHarvest(s, dt, () => times.push(t));
    }
    expect(times.length).toBeGreaterThan(1);
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(T_MIN - 1e-6);
    }
  });

  it('一帧跨多周期时用 while 补发', () => {
    const s = initHarvest(2); // X=2, D=1
    let count = 0;
    const total = tickHarvest(s, 2.0, () => count++); // 2s / D=1 → 弹 2 次
    expect(count).toBe(2);
    expect(total).toBe(2 * s.X);
  });

  it('零漂移：长期累计 ≈ r × 时长（误差 < 一个 X）', () => {
    for (const r of [0.7, 3.3, 6.34, 25.0]) {
      const s = initHarvest(r);
      let sum = 0;
      const duration = 600; // 10 分钟
      const dt = 1 / 60;
      const steps = Math.round(duration / dt);
      for (let i = 0; i < steps; i++) {
        tickHarvest(s, dt, (x) => (sum += x));
      }
      // 用实际模拟时长（steps*dt 与 duration 有浮点差）；
      // 未弹出的余量 < 一个周期 D，对应价值 < X，故误差 ≤ X（含浮点 epsilon）。
      const expected = r * (steps * dt);
      expect(sum).toBeLessThanOrEqual(expected + 1e-6);
      expect(expected - sum).toBeLessThanOrEqual(s.X + 1e-6);
    }
  });

  it('dt <= 0 不产出', () => {
    const s = initHarvest(2);
    let count = 0;
    tickHarvest(s, 0, () => count++);
    tickHarvest(s, -1, () => count++);
    expect(count).toBe(0);
  });
});
