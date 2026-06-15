import type { Plugin } from 'vite';

/**
 * DEV-only：mock `/api/quotes`，让本地开发无需真行情后端即可跑通投资资产。
 * 仅识别已知代码（含 5 个示例股票 + 常见 ETF）；未知代码"查不到"（便于测试拦截）。
 * 价格按代码稳定（base × (1 + 当日涨跌)），涨跌幅按代码散布在 ±11%，方便看 7 档动画。
 * 生产环境改用 functions/api/quotes.ts（Cloudflare Pages Function + Twelve Data）。
 */
const BASE: Record<string, number> = {
  NVDA: 140,
  AAPL: 230,
  TSLA: 250,
  MSFT: 430,
  AMZN: 185,
  GOOGL: 175,
  META: 560,
  QQQ: 480,
  SPY: 580,
  AMD: 165,
  NFLX: 700,
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mockQuote(sym: string): { symbol: string; price: number; dayChangePct: number } | null {
  const base = BASE[sym];
  if (base == null) return null;
  const dayChangePct = ((hash(sym) % 23) - 11) / 100; // -0.11 .. +0.11，按代码稳定
  const price = Math.round(base * (1 + dayChangePct) * 100) / 100;
  return { symbol: sym, price, dayChangePct };
}

export function quotesMockPlugin(): Plugin {
  return {
    name: 'mineo-quotes-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/quotes', (req, res) => {
        const search = (req.url ?? '').includes('?') ? (req.url ?? '').slice((req.url ?? '').indexOf('?')) : '';
        const symbols = new URLSearchParams(search)
          .get('symbols')
          ?.split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean) ?? [];
        const out: Record<string, unknown> = {};
        for (const sym of symbols) {
          const q = mockQuote(sym);
          if (q) out[sym] = q;
        }
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(out));
      });
    },
  };
}
