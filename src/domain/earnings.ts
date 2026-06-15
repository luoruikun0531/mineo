import type { Asset, Settings } from './types';

export const SECONDS_PER_YEAR = 365 * 24 * 3600; // 31,536,000

/** 资产的年产出（以全局货币计） */
export function annualYield(asset: Asset): number {
  switch (asset.kind) {
    case 'cashflow':
      return asset.annualIncome;
    case 'investment':
      return asset.principal * asset.annualReturnRate;
  }
}

/**
 * 资产每秒产出速率 r，单位为"展示单位/秒"。
 * - 非隐私模式：展示单位 = 全局货币。
 * - 隐私模式：展示单位 = 金币。约定 **1 单位货币 = goldRate 金币**
 *   （金币面额比货币小，故乘以 goldRate；数字更大、更"爽"也更隐私）。
 * 见 docs/02-DATA-MODEL.md §3、§4。
 */
export function perSecondRate(asset: Asset, settings: Settings): number {
  const rCurrency = annualYield(asset) / SECONDS_PER_YEAR;
  if (settings.privacyMode) {
    const goldRate = settings.goldRate;
    if (!goldRate || goldRate <= 0) {
      throw new Error('privacyMode 开启时 goldRate 必须为正数');
    }
    return rCurrency * goldRate;
  }
  return rCurrency;
}
