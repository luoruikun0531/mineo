import { describe, it, expect } from 'vitest';
import { assetInputSchema, buildAsset } from './assetInput';
import { SECONDS_PER_YEAR } from './earnings';

describe('assetInputSchema', () => {
  it('接受 4 类合法输入', () => {
    expect(assetInputSchema.safeParse({ kind: 'cashflow', name: '工资', iconId: 'w', annualIncome: 120000 }).success).toBe(true);
    expect(assetInputSchema.safeParse({ kind: 'deposit', name: '存款', iconId: 'w', principal: 1000, annualRate: 0.03 }).success).toBe(true);
    expect(assetInputSchema.safeParse({ kind: 'realestate', name: '房', iconId: 'w', estimatedValue: 2000000, annualRent: 60000 }).success).toBe(true);
    expect(assetInputSchema.safeParse({ kind: 'investment', name: '股', iconId: 'w', symbol: 'AAPL', shares: 10, latestPrice: 200 }).success).toBe(true);
  });

  it('空名字 → name', () => {
    const r = assetInputSchema.safeParse({ kind: 'cashflow', name: '   ', iconId: 'w', annualIncome: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('name');
  });

  it('现金流金额 ≤ 0 → amount', () => {
    const r = assetInputSchema.safeParse({ kind: 'cashflow', name: '工资', iconId: 'w', annualIncome: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'amount')).toBe(true);
  });

  it('投资缺代码 → symbol', () => {
    const r = assetInputSchema.safeParse({ kind: 'investment', name: '股', iconId: 'w', shares: 10, latestPrice: 200 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'symbol')).toBe(true);
  });
});

describe('buildAsset 归一化', () => {
  it('现金流：value=0，productivity=年收入/年秒，trim 名字', () => {
    const a = buildAsset(
      { kind: 'cashflow', name: ' 工资 ', iconId: 'w', annualIncome: 120000 },
      'id-1',
      999,
      { cell: { x: 1, y: 2 } },
    );
    expect(a.id).toBe('id-1');
    expect(a.createdAt).toBe(999);
    expect(a.cell).toEqual({ x: 1, y: 2 });
    expect(a.name).toBe('工资');
    expect(a.valueBase).toBe(0);
    expect(a.productivityPerSecond).toBeCloseTo(120000 / SECONDS_PER_YEAR, 12);
  });

  it('存款：quantity=本金, unitValue=1, value=本金', () => {
    const a = buildAsset({ kind: 'deposit', name: '存', iconId: 'w', principal: 1000, annualRate: 0.03 }, 'id', 0);
    expect(a.quantity).toBe(1000);
    expect(a.unitValue).toBe(1);
    expect(a.valueBase).toBe(1000);
    expect(a.productivityPerSecond).toBeCloseTo((1000 * 0.03) / SECONDS_PER_YEAR, 12);
  });

  it('房产：quantity=1, unitValue=估值, value=估值', () => {
    const a = buildAsset({ kind: 'realestate', name: '房', iconId: 'w', estimatedValue: 2000000, annualRent: 60000 }, 'id', 0);
    expect(a.quantity).toBe(1);
    expect(a.unitValue).toBe(2000000);
    expect(a.valueBase).toBe(2000000);
    expect(a.productivityPerSecond).toBeCloseTo(60000 / SECONDS_PER_YEAR, 12);
  });

  it('投资：quantity=股数, unitValue=价, value=股数*价, productivity=0, 代码大写', () => {
    const a = buildAsset({ kind: 'investment', name: '股', iconId: 'w', symbol: 'aapl', shares: 10, latestPrice: 200 }, 'id', 0);
    expect(a.kind).toBe('investment');
    if (a.kind === 'investment') {
      expect(a.quantity).toBe(10);
      expect(a.unitValue).toBe(200);
      expect(a.valueBase).toBe(2000);
      expect(a.symbol).toBe('AAPL');
      expect(a.productivityPerSecond).toBe(0);
    }
  });

  it('编辑时结转旧价值（valueBase = 旧资产当前值）', () => {
    const created = buildAsset({ kind: 'deposit', name: '存', iconId: 'w', principal: 1000, annualRate: 0.03 }, 'id', 0);
    // 一年后编辑（改本金），应结转 ~1030 为新 valueBase
    const edited = buildAsset(
      { kind: 'deposit', name: '存', iconId: 'w', principal: 2000, annualRate: 0.03 },
      'id',
      SECONDS_PER_YEAR * 1000,
      { createdAt: created.createdAt, cell: created.cell, prev: created },
    );
    expect(edited.valueBase).toBeCloseTo(1030, 0);
  });
});
