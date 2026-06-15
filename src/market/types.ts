/** 行情报价（统一格式，与数据源无关）。 */
export interface Quote {
  symbol: string;
  /** 最新价 */
  price: number;
  /** 当日涨跌幅，如 0.05 = +5%、-0.03 = -3% */
  dayChangePct: number;
}
