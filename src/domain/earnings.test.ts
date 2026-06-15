import { describe, it, expect } from 'vitest';
import { annualYield, perSecondRate, SECONDS_PER_YEAR } from './earnings';
import type { CashflowAsset, InvestmentAsset, Settings } from './types';

const cell = { x: 0, y: 0 };

const cashflow: CashflowAsset = {
  id: 'a',
  kind: 'cashflow',
  name: '工资',
  iconId: 'wheat',
  cell,
  createdAt: 0,
  annualIncome: 120_000,
};

const investment: InvestmentAsset = {
  id: 'b',
  kind: 'investment',
  name: '指数',
  iconId: 'tree',
  cell,
  createdAt: 0,
  principal: 1_000_000,
  annualReturnRate: 0.08,
};

const plain: Settings = { currency: 'CNY', language: 'en', privacyMode: false };
const privacy: Settings = {
  currency: 'CNY',
  language: 'en',
  privacyMode: true,
  goldRate: 100,
};

describe('annualYield', () => {
  it('现金流 = 年收入', () => {
    expect(annualYield(cashflow)).toBe(120_000);
  });
  it('投资 = 本金 × 年收益率', () => {
    expect(annualYield(investment)).toBe(80_000);
  });
});

describe('perSecondRate', () => {
  it('非隐私模式：r = 年产出 / 一年秒数', () => {
    expect(perSecondRate(cashflow, plain)).toBeCloseTo(
      120_000 / SECONDS_PER_YEAR,
      12,
    );
  });

  it('隐私模式：再乘以 goldRate（1 货币 = goldRate 金币）', () => {
    expect(perSecondRate(investment, privacy)).toBeCloseTo(
      (80_000 / SECONDS_PER_YEAR) * 100,
      12,
    );
  });

  it('隐私模式缺少有效 goldRate 时抛错', () => {
    const bad: Settings = { currency: 'CNY', language: 'en', privacyMode: true };
    expect(() => perSecondRate(cashflow, bad)).toThrow();
    expect(() =>
      perSecondRate(cashflow, { ...bad, goldRate: 0 }),
    ).toThrow();
  });
});
