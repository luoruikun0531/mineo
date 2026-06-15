import type { Asset, Settings } from './types';

export const SECONDS_PER_YEAR = 365 * 24 * 3600; // 31,536,000

/**
 * 资产当前价值（currency 单位）。
 *  - 投资：shares * latestPrice（随行情变，不随时间累积）。
 *  - 其余：valueBase + productivityPerSecond * 已过秒数（确定式累积，无需每帧写库）。
 */
export function currentValue(asset: Asset, now: number): number {
  if (asset.kind === 'investment') return asset.shares * asset.latestPrice;
  const elapsedSec = Math.max(0, (now - asset.accrualStart) / 1000);
  return asset.valueBase + asset.productivityPerSecond * elapsedSec;
}

/** 总价值 = 所有资产当前价值之和（currency 单位）。 */
export function totalValue(assets: readonly Asset[], now: number): number {
  let sum = 0;
  for (const a of assets) sum += currentValue(a, now);
  return sum;
}

/**
 * 驱动进度条 / "爆金币" 动画的每秒产出速率（展示单位）。
 *  = productivityPerSecond；隐私模式下 × goldRate（金币面额更小、数字更"爽"、更私密）。
 *  投资类 productivityPerSecond = 0 → 速率 0（无金币，改走 7 档涨跌动画）。
 */
export function productivityRate(asset: Asset, settings: Settings): number {
  const r = asset.productivityPerSecond;
  if (r <= 0) return 0;
  if (settings.privacyMode) {
    const goldRate = settings.goldRate;
    if (!goldRate || goldRate <= 0) {
      throw new Error('privacyMode 开启时 goldRate 必须为正数');
    }
    return r * goldRate;
  }
  return r;
}
