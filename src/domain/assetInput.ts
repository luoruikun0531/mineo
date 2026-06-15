import { z } from 'zod';
import type { Asset, GridCell } from './types';
import { currentValue, SECONDS_PER_YEAR } from './earnings';

/**
 * 录入资产的输入校验（系统边界）。4 类资产字段不同，但都落地成归一化资产。
 * 货币与隐私是全局设置，不在此录入。
 */
export const assetInputSchema = z
  .object({
    kind: z.enum(['cashflow', 'deposit', 'realestate', 'investment']),
    name: z.string().trim().min(1, 'name').max(24, 'nameLong'),
    iconId: z.string().min(1, 'icon'),
    // cashflow
    annualIncome: z.number().nonnegative().optional(),
    // deposit
    principal: z.number().nonnegative().optional(),
    annualRate: z.number().min(-1).max(10).optional(),
    // realestate
    estimatedValue: z.number().nonnegative().optional(),
    annualRent: z.number().nonnegative().optional(),
    // investment（代码 + 股数 + 最新价；价格由"查价"按钮解析得到）
    symbol: z.string().trim().optional(),
    shares: z.number().nonnegative().optional(),
    latestPrice: z.number().nonnegative().optional(),
    dayChangePct: z.number().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'cashflow') {
      if (v.annualIncome == null || v.annualIncome <= 0) {
        ctx.addIssue({ code: 'custom', path: ['annualIncome'], message: 'amount' });
      }
    } else if (v.kind === 'deposit') {
      if (v.principal == null || v.principal <= 0) {
        ctx.addIssue({ code: 'custom', path: ['principal'], message: 'amount' });
      }
      if (v.annualRate == null || Number.isNaN(v.annualRate)) {
        ctx.addIssue({ code: 'custom', path: ['annualRate'], message: 'rate' });
      }
    } else if (v.kind === 'realestate') {
      if (v.estimatedValue == null || v.estimatedValue <= 0) {
        ctx.addIssue({ code: 'custom', path: ['estimatedValue'], message: 'amount' });
      }
      if (v.annualRent == null || v.annualRent < 0) {
        ctx.addIssue({ code: 'custom', path: ['annualRent'], message: 'amount' });
      }
    } else {
      if (!v.symbol) {
        ctx.addIssue({ code: 'custom', path: ['symbol'], message: 'symbol' });
      }
      if (v.shares == null || v.shares <= 0) {
        ctx.addIssue({ code: 'custom', path: ['shares'], message: 'amount' });
      }
      if (v.latestPrice == null || v.latestPrice <= 0) {
        ctx.addIssue({ code: 'custom', path: ['latestPrice'], message: 'symbol' });
      }
    }
  });

export type AssetInput = z.infer<typeof assetInputSchema>;

export interface BuildOpts {
  createdAt?: number;
  cell?: GridCell;
  /** 编辑时传入旧资产：结转其当前价值为 valueBase，accrualStart 重置为 now。 */
  prev?: Asset;
}

/**
 * 由校验过的输入构建一个归一化资产（不可变）。
 *  - 创建：valueBase = 初始价值(quantity*unitValue)，accrualStart = now。
 *  - 编辑：valueBase = 旧资产当前价值（结转已累积），accrualStart = now（新 productivity 从此累加）。
 */
export function buildAsset(input: AssetInput, id: string, now: number, opts: BuildOpts = {}): Asset {
  const createdAt = opts.createdAt ?? now;
  const cell = opts.cell ?? { x: 0, y: 0 };
  const name = input.name.trim();
  const common = { id, name, iconId: input.iconId, cell, createdAt, accrualStart: now };
  const banked = (initial: number) => (opts.prev ? currentValue(opts.prev, now) : initial);

  switch (input.kind) {
    case 'cashflow': {
      const annualIncome = input.annualIncome ?? 0;
      return {
        ...common,
        kind: 'cashflow',
        quantity: 0,
        unitValue: 0,
        productivityPerSecond: annualIncome / SECONDS_PER_YEAR,
        valueBase: banked(0),
        annualIncome,
      };
    }
    case 'deposit': {
      const principal = input.principal ?? 0;
      const annualRate = input.annualRate ?? 0;
      return {
        ...common,
        kind: 'deposit',
        quantity: principal,
        unitValue: 1,
        productivityPerSecond: (principal * annualRate) / SECONDS_PER_YEAR,
        valueBase: banked(principal),
        principal,
        annualRate,
      };
    }
    case 'realestate': {
      const estimatedValue = input.estimatedValue ?? 0;
      const annualRent = input.annualRent ?? 0;
      return {
        ...common,
        kind: 'realestate',
        quantity: 1,
        unitValue: estimatedValue,
        productivityPerSecond: annualRent / SECONDS_PER_YEAR,
        valueBase: banked(estimatedValue),
        estimatedValue,
        annualRent,
      };
    }
    default: {
      const shares = input.shares ?? 0;
      const latestPrice = input.latestPrice ?? 0;
      return {
        ...common,
        kind: 'investment',
        quantity: shares,
        unitValue: latestPrice,
        productivityPerSecond: 0,
        valueBase: shares * latestPrice,
        symbol: (input.symbol ?? '').trim().toUpperCase(),
        shares,
        latestPrice,
        dayChangePct: input.dayChangePct ?? 0,
      };
    }
  }
}
