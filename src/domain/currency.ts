import type { CurrencyCode, Settings } from './types';

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  SGD: 'S$',
};

export const GOLD_SYMBOL = '🪙';

/** 当前展示单位的符号（隐私模式下为金币） */
export function displaySymbol(settings: Settings): string {
  return settings.privacyMode ? GOLD_SYMBOL : CURRENCY_SYMBOL[settings.currency];
}

/** 千分位整数格式化 */
export function formatAmount(value: number): string {
  return Math.trunc(value).toLocaleString('en-US');
}

/** "+1,240 ¥" 形式的收成文案 */
export function formatHarvest(value: number, settings: Settings): string {
  return `+${formatAmount(value)} ${displaySymbol(settings)}`;
}
