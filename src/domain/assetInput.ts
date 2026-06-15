import { z } from 'zod';
import type { Asset } from './types';

/**
 * 录入资产的输入校验（系统边界）。
 * 货币与隐私是全局设置，不在此录入；这里只管资产本身。
 */
export const assetInputSchema = z
  .object({
    kind: z.enum(['cashflow', 'investment']),
    name: z.string().trim().min(1, 'name').max(24, 'nameLong'),
    iconId: z.string().min(1, 'icon'),
    annualIncome: z.number().nonnegative().optional(),
    principal: z.number().nonnegative().optional(),
    annualReturnRate: z.number().min(-1).max(10).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'cashflow') {
      if (v.annualIncome == null || v.annualIncome <= 0) {
        ctx.addIssue({ code: 'custom', path: ['annualIncome'], message: 'amount' });
      }
    } else {
      if (v.principal == null || v.principal <= 0) {
        ctx.addIssue({ code: 'custom', path: ['principal'], message: 'amount' });
      }
      if (v.annualReturnRate == null || Number.isNaN(v.annualReturnRate)) {
        ctx.addIssue({ code: 'custom', path: ['annualReturnRate'], message: 'rate' });
      }
    }
  });

export type AssetInput = z.infer<typeof assetInputSchema>;

/** 由校验过的输入构建一个 Asset（不可变） */
export function buildAsset(
  input: AssetInput,
  id: string,
  createdAt: number,
  cell: { x: number; y: number } = { x: 0, y: 0 },
): Asset {
  const base = { id, name: input.name.trim(), iconId: input.iconId, cell, createdAt };
  if (input.kind === 'investment') {
    return {
      ...base,
      kind: 'investment',
      principal: input.principal ?? 0,
      annualReturnRate: input.annualReturnRate ?? 0,
    };
  }
  return { ...base, kind: 'cashflow', annualIncome: input.annualIncome ?? 0 };
}
