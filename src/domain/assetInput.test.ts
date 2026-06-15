import { describe, it, expect } from 'vitest';
import { assetInputSchema, buildAsset } from './assetInput';

describe('assetInputSchema', () => {
  it('接受合法的现金流输入', () => {
    const r = assetInputSchema.safeParse({
      kind: 'cashflow',
      name: '工资',
      iconId: 'wheat-farm',
      annualIncome: 120000,
    });
    expect(r.success).toBe(true);
  });

  it('接受合法的投资输入', () => {
    const r = assetInputSchema.safeParse({
      kind: 'investment',
      name: '指数',
      iconId: 'orchard',
      principal: 1_000_000,
      annualReturnRate: 0.08,
    });
    expect(r.success).toBe(true);
  });

  it('空名字 → 报 name', () => {
    const r = assetInputSchema.safeParse({
      kind: 'cashflow',
      name: '   ',
      iconId: 'wheat-farm',
      annualIncome: 1,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('name');
  });

  it('现金流金额 ≤ 0 → 报 amount', () => {
    const r = assetInputSchema.safeParse({
      kind: 'cashflow',
      name: '工资',
      iconId: 'wheat-farm',
      annualIncome: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'amount')).toBe(true);
  });

  it('投资缺金额 → 报 amount', () => {
    const r = assetInputSchema.safeParse({
      kind: 'investment',
      name: '指数',
      iconId: 'orchard',
      annualReturnRate: 0.08,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'amount')).toBe(true);
  });
});

describe('buildAsset', () => {
  it('保留 id/createdAt/cell，按类型构建', () => {
    const cell = { x: 1, y: 2 };
    const a = buildAsset(
      { kind: 'cashflow', name: ' 工资 ', iconId: 'wheat-farm', annualIncome: 120000 },
      'id-1',
      999,
      cell,
    );
    expect(a.id).toBe('id-1');
    expect(a.createdAt).toBe(999);
    expect(a.cell).toEqual(cell);
    expect(a.name).toBe('工资'); // trim
    expect(a.kind).toBe('cashflow');
    if (a.kind === 'cashflow') expect(a.annualIncome).toBe(120000);
  });

  it('投资携带 principal 与 annualReturnRate', () => {
    const a = buildAsset(
      {
        kind: 'investment',
        name: '指数',
        iconId: 'orchard',
        principal: 5000,
        annualReturnRate: 0.05,
      },
      'id-2',
      1,
    );
    expect(a.kind).toBe('investment');
    if (a.kind === 'investment') {
      expect(a.principal).toBe(5000);
      expect(a.annualReturnRate).toBe(0.05);
    }
  });
});
