import { describe, it, expect } from 'vitest';
import { displaySymbol, formatAmount, formatHarvest, GOLD_SYMBOL } from './currency';
import type { Settings } from './types';

describe('currency formatting', () => {
  it('非隐私模式用货币符号', () => {
    const s: Settings = { currency: 'JPY', language: 'en', privacyMode: false };
    expect(displaySymbol(s)).toBe('¥');
  });

  it('隐私模式用金币符号', () => {
    const s: Settings = {
      currency: 'USD',
      language: 'en',
      privacyMode: true,
      goldRate: 10,
    };
    expect(displaySymbol(s)).toBe(GOLD_SYMBOL);
  });

  it('千分位 + 截断为整数', () => {
    expect(formatAmount(1234567.9)).toBe('1,234,567');
    expect(formatAmount(0)).toBe('0');
  });

  it('收成文案形如 +1,240 ¥', () => {
    const s: Settings = { currency: 'CNY', language: 'en', privacyMode: false };
    expect(formatHarvest(1240, s)).toBe('+1,240 ¥');
  });
});
