import { describe, it, expect } from 'vitest';
import {
  appendSnapshot,
  dailyProductivity,
  monthlyProductivity,
  progressToGoal,
  valueChangeOver,
} from './metrics';
import { buildAsset } from './assetInput';
import { SECONDS_PER_YEAR, totalValue } from './earnings';

const DAY_MS = 86_400 * 1000;
// 年收入 = 一年秒数 → productivity = 1/秒（便于心算）
const cashflow = buildAsset(
  { kind: 'cashflow', name: '工资', iconId: 'w', annualIncome: SECONDS_PER_YEAR },
  'a',
  0,
);

describe('valueChangeOver — 无历史快照 → 确定式估计', () => {
  it('一日生产力 ≈ 赚息/秒 × 86400', () => {
    expect(dailyProductivity([cashflow], [], 1000)).toBeCloseTo(86_400, 0);
  });
  it('一月生产力 ≈ 30 × 一日', () => {
    expect(monthlyProductivity([cashflow], [], 1000)).toBeCloseTo(86_400 * 30, 0);
  });
});

describe('valueChangeOver — 有快照 → 真实总价值变化', () => {
  it('= 当前总价值 − 一天前快照', () => {
    const now = 100 * DAY_MS;
    const snaps = [{ t: now - DAY_MS, value: 1000 }];
    const cur = totalValue([cashflow], now);
    expect(valueChangeOver([cashflow], snaps, now, 86_400)).toBeCloseTo(cur - 1000, 0);
  });
});

describe('progressToGoal', () => {
  it('= 总价值 / 目标', () => {
    expect(progressToGoal([cashflow], DAY_MS, 172_800)).toBeCloseTo(0.5, 1);
  });
  it('目标无效 → 0', () => {
    expect(progressToGoal([cashflow], 1000, 0)).toBe(0);
    expect(progressToGoal([cashflow], 1000, undefined)).toBe(0);
  });
});

describe('appendSnapshot', () => {
  it('追加新点并裁剪超期点', () => {
    const r = appendSnapshot(
      [
        { t: 0, value: 1 },
        { t: 30 * DAY_MS, value: 2 },
      ],
      31 * DAY_MS + 1000,
      3,
      31,
    );
    expect(r.map((s) => s.value)).toEqual([2, 3]);
  });
});
