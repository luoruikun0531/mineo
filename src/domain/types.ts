/**
 * 领域类型 —— 纯数据，无 UI / 无渲染依赖。
 * 见 docs/02-DATA-MODEL.md 与 docs/11-ASSET-MODEL.md。
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

/** 资产类型（4 类） */
export type AssetKind = 'cashflow' | 'deposit' | 'realestate' | 'investment';

export const ASSET_KINDS: readonly AssetKind[] = [
  'cashflow',
  'deposit',
  'realestate',
  'investment',
] as const;

export interface GridCell {
  x: number;
  y: number;
}

/**
 * 所有资产归一化的核心字段（铁律）：
 *  - value（当前价值）= quantity * unitValue，并随 productivityPerSecond 随时间累积
 *    （确定式累积：currentValue = valueBase + productivityPerSecond * 已过秒数，见 earnings.ts）。
 *  - productivityPerSecond：每秒稳定产出的价值，驱动进度条与"爆金币"动画（投资类为 0）。
 * 不同资产类型在录入层字段不同，但都落地成这套归一化字段。
 */
interface AssetBase {
  id: string;
  kind: AssetKind;
  name: string;
  iconId: string;
  cell: GridCell;
  createdAt: number; // epoch ms
  // ---- 归一化核心 ----
  /** 数量 */
  quantity: number;
  /** 单位价值 */
  unitValue: number;
  /** 每秒产出价值（驱动进度条/金币；投资=0） */
  productivityPerSecond: number;
  /** 已结转价值（创建=quantity*unitValue；编辑时结转当前值） */
  valueBase: number;
  /** 价值累积起点（epoch ms；productivity 从此刻起累加；编辑时重置为 now） */
  accrualStart: number;
}

/** 现金流：录入年收入。落地 value=0、productivity=annualIncome/年秒。 */
export interface CashflowAsset extends AssetBase {
  kind: 'cashflow';
  annualIncome: number;
}

/** 存款：录入本金 + 年利率。落地 quantity=principal、unitValue=1、value=principal、productivity=principal*rate/年秒。 */
export interface DepositAsset extends AssetBase {
  kind: 'deposit';
  principal: number;
  /** 年利率，如 0.03 = 3% */
  annualRate: number;
}

/** 房产：录入估值 + 租金（成本不计）。落地 quantity=1、unitValue=estimatedValue、value=estimatedValue、productivity=annualRent/年秒。 */
export interface RealEstateAsset extends AssetBase {
  kind: 'realestate';
  estimatedValue: number;
  annualRent: number;
}

/** 投资（股票/ETF）：录入代码 + 股数/金额。落地 quantity=shares、unitValue=latestPrice、value=shares*price、productivity=0。 */
export interface InvestmentAsset extends AssetBase {
  kind: 'investment';
  /** 交易代码，如 AAPL、QQQ、0700.HK */
  symbol: string;
  /** 股数（= quantity） */
  shares: number;
  /** 最新价（= unitValue），由行情刷新 */
  latestPrice: number;
  /** 当日涨跌幅（如 0.05 = +5%），由行情刷新，驱动 7 档动画与价格标签 */
  dayChangePct: number;
}

export type Asset = CashflowAsset | DepositAsset | RealEstateAsset | InvestmentAsset;

/** 界面语言（MVP 仅支持英语与中文） */
export type Language = 'en' | 'zh';

export const LANGUAGES: readonly Language[] = ['en', 'zh'] as const;

/** 全局设置 —— 货币、语言、隐私模式、总价值目标。 */
export interface Settings {
  currency: CurrencyCode;
  language: Language;
  privacyMode: boolean;
  /** 1 单位 currency = goldRate 金币（仅隐私模式用；金币面额更小） */
  goldRate?: number;
  /** 总价值进度的目标值（总价值 / 目标 = 进度）。 */
  goalValue?: number;
}

/** 总价值快照（用于算一日/一月生产力 = 总价值变化）。 */
export interface ValueSnapshot {
  /** epoch ms */
  t: number;
  /** 当时总价值 */
  value: number;
}

/** 收成账本（旧总览；Phase B 将由总价值指标取代，过渡期保留）。 */
export interface Ledger {
  cumulative: number;
  today: number;
  /** "YYYY-MM-DD"（本地时区），用于午夜重置 */
  todayDateKey: string;
  /** 本轮累积起点（清零按钮刷新它） */
  countingSince: number;
}
