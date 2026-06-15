import { describe, it, expect } from 'vitest';
import { currentValue, productivityRate, totalValue, SECONDS_PER_YEAR } from './earnings';
import { buildAsset } from './assetInput';
import type { Settings } from './types';

const plain: Settings = { currency: 'CNY', language: 'en', privacyMode: false };
const privacy: Settings = { currency: 'CNY', language: 'en', privacyMode: true, goldRate: 100 };

const cashflow = buildAsset(
  { kind: 'cashflow', name: '工资', iconId: 'wheat-farm', annualIncome: 120_000 },
  'a',
  0,
);
const deposit = buildAsset(
  { kind: 'deposit', name: '存款', iconId: 'wheat-farm', principal: 1_000_000, annualRate: 0.03 },
  'b',
  0,
);
const realestate = buildAsset(
  { kind: 'realestate', name: '房', iconId: 'wheat-farm', estimatedValue: 2_000_000, annualRent: 60_000 },
  'c',
  0,
);
const investment = buildAsset(
  { kind: 'investment', name: '股', iconId: 'wheat-farm', symbol: 'AAPL', shares: 10, latestPrice: 200 },
  'd',
  0,
);

const ONE_YEAR_MS = SECONDS_PER_YEAR * 1000;

describe('productivityRate', () => {
  it('现金流 = 年收入 / 年秒', () => {
    expect(productivityRate(cashflow, plain)).toBeCloseTo(120_000 / SECONDS_PER_YEAR, 12);
  });
  it('存款 = 本金 × 利率 / 年秒', () => {
    expect(productivityRate(deposit, plain)).toBeCloseTo((1_000_000 * 0.03) / SECONDS_PER_YEAR, 12);
  });
  it('投资 productivity = 0（无金币）', () => {
    expect(productivityRate(investment, plain)).toBe(0);
  });
  it('隐私模式 × goldRate', () => {
    expect(productivityRate(cashflow, privacy)).toBeCloseTo((120_000 / SECONDS_PER_YEAR) * 100, 12);
  });
  it('隐私模式缺 goldRate → 抛错', () => {
    const bad: Settings = { currency: 'CNY', language: 'en', privacyMode: true };
    expect(() => productivityRate(cashflow, bad)).toThrow();
    expect(() => productivityRate(cashflow, { ...bad, goldRate: 0 })).toThrow();
  });
});

describe('currentValue', () => {
  it('现金流：创建时 0，一年后 ≈ 年收入', () => {
    expect(currentValue(cashflow, 0)).toBe(0);
    expect(currentValue(cashflow, ONE_YEAR_MS)).toBeCloseTo(120_000, 0);
  });
  it('存款：本金 + 利息', () => {
    expect(currentValue(deposit, 0)).toBe(1_000_000);
    expect(currentValue(deposit, ONE_YEAR_MS)).toBeCloseTo(1_030_000, 0);
  });
  it('房产：估值 + 租金累积', () => {
    expect(currentValue(realestate, 0)).toBe(2_000_000);
    expect(currentValue(realestate, ONE_YEAR_MS)).toBeCloseTo(2_060_000, 0);
  });
  it('投资：股数 × 最新价（不随时间变）', () => {
    expect(currentValue(investment, 0)).toBe(2_000);
    expect(currentValue(investment, ONE_YEAR_MS)).toBe(2_000);
  });
});

describe('totalValue', () => {
  it('= 各资产当前价值之和', () => {
    expect(totalValue([cashflow, deposit, realestate, investment], 0)).toBe(
      0 + 1_000_000 + 2_000_000 + 2_000,
    );
  });
});
