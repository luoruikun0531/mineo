import type { Asset, ValueSnapshot } from './types';
import { currentValue, totalValue } from './earnings';

const DAY = 86_400; // 秒

/** 非投资资产的每秒赚息（确定式线性增长部分）。 */
function earningPerSecond(assets: readonly Asset[]): number {
  let r = 0;
  for (const a of assets) if (a.kind !== 'investment') r += a.productivityPerSecond;
  return r;
}

/**
 * 由快照插值出某时刻的总价值；t 早于最早快照则返回 null（历史不足）。
 * 约定 snapshots 按 t 升序。
 */
function valueAt(snapshots: readonly ValueSnapshot[], t: number): number | null {
  const n = snapshots.length;
  if (n === 0) return null;
  if (t < snapshots[0].t) return null;
  if (t >= snapshots[n - 1].t) return snapshots[n - 1].value;
  for (let i = 1; i < n; i++) {
    if (t <= snapshots[i].t) {
      const a = snapshots[i - 1];
      const b = snapshots[i];
      const span = b.t - a.t || 1;
      return a.value + (b.value - a.value) * ((t - a.t) / span);
    }
  }
  return snapshots[n - 1].value;
}

/**
 * 总价值在过去 windowSec 的变化（"生产力"）。
 *  - 有足够历史快照 → 真实变化（含股票涨跌）。
 *  - 历史不足 → 确定式估计：赚息线性部分 + 股票按当日涨跌幅折算到窗口（封顶 30 天）。
 */
export function valueChangeOver(
  assets: readonly Asset[],
  snapshots: readonly ValueSnapshot[],
  now: number,
  windowSec: number,
): number {
  const cur = totalValue(assets, now);
  const past = valueAt(snapshots, now - windowSec * 1000);
  if (past != null) return cur - past;

  const earning = earningPerSecond(assets) * windowSec;
  let stockDay = 0;
  for (const a of assets) {
    if (a.kind === 'investment') stockDay += currentValue(a, now) * a.dayChangePct;
  }
  const stock = stockDay * Math.min(windowSec / DAY, 30);
  return earning + stock;
}

/** 一日生产力 = 总价值过去 1 天的变化。 */
export function dailyProductivity(
  assets: readonly Asset[],
  snapshots: readonly ValueSnapshot[],
  now: number,
): number {
  return valueChangeOver(assets, snapshots, now, DAY);
}

/** 一月生产力 = 总价值过去 30 天的变化。 */
export function monthlyProductivity(
  assets: readonly Asset[],
  snapshots: readonly ValueSnapshot[],
  now: number,
): number {
  return valueChangeOver(assets, snapshots, now, 30 * DAY);
}

/** 总价值进度 = 总价值 / 目标（goal ≤ 0 时返回 0）。可 > 1。 */
export function progressToGoal(
  assets: readonly Asset[],
  now: number,
  goalValue: number | undefined,
): number {
  if (!goalValue || goalValue <= 0) return 0;
  return totalValue(assets, now) / goalValue;
}

/** 追加一条总价值快照并裁剪到最近 maxDays 天（默认 31）。返回新数组（不可变）。 */
export function appendSnapshot(
  snapshots: readonly ValueSnapshot[],
  t: number,
  value: number,
  maxDays = 31,
): ValueSnapshot[] {
  const cutoff = t - maxDays * DAY * 1000;
  const kept = snapshots.filter((s) => s.t >= cutoff);
  // 同一秒内去重（避免节流保存堆积）
  const last = kept[kept.length - 1];
  if (last && t - last.t < 1000) {
    return [...kept.slice(0, -1), { t, value }];
  }
  return [...kept, { t, value }];
}
