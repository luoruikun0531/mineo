/**
 * 领域类型 —— 纯数据，无 UI / 无渲染依赖。
 * 见 docs/02-DATA-MODEL.md。
 */

/** 支持的货币（全局唯一） */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'SGD';

export const CURRENCIES: readonly CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'SGD',
] as const;

/** 资产类型 */
export type AssetKind = 'cashflow' | 'investment';

export interface GridCell {
  x: number;
  y: number;
}

interface AssetBase {
  id: string;
  kind: AssetKind;
  name: string;
  iconId: string;
  cell: GridCell;
  createdAt: number; // epoch ms
}

export interface CashflowAsset extends AssetBase {
  kind: 'cashflow';
  /** 年收入（以全局货币计） */
  annualIncome: number;
}

export interface InvestmentAsset extends AssetBase {
  kind: 'investment';
  /** 当前金额 */
  principal: number;
  /** 预期年收益率，如 0.08 = 8% */
  annualReturnRate: number;
}

export type Asset = CashflowAsset | InvestmentAsset;

/** 界面语言（MVP 仅支持英语与中文） */
export type Language = 'en' | 'zh';

export const LANGUAGES: readonly Language[] = ['en', 'zh'] as const;

/** 全局设置 —— 货币、语言与隐私模式都在这里（全局唯一） */
export interface Settings {
  currency: CurrencyCode;
  language: Language;
  privacyMode: boolean;
  /** 1 单位 currency = goldRate 金币（仅隐私模式用；金币面额更小） */
  goldRate?: number;
}

/** 收成账本 */
export interface Ledger {
  cumulative: number;
  today: number;
  /** "YYYY-MM-DD"（本地时区），用于午夜重置 */
  todayDateKey: string;
  /** 本轮累积起点（清零按钮刷新它） */
  countingSince: number;
}
