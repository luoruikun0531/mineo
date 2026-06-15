/**
 * Cloudflare Pages Function：GET /api/quotes?symbols=AAPL,QQQ,0700.HK
 *
 * cache-aside over KV：
 *  - 命中且新鲜（<30 分钟）→ 直接返回缓存。
 *  - 命中但过期 → 先返回旧值，后台刷新（waitUntil）。
 *  - 未命中 → 同步请求 Twelve Data，写 KV 后返回。
 * 只缓存用户实际请求过的 symbol（无全市场轮询）。
 *
 * 部署需在 Cloudflare Pages 配置：
 *  - KV 绑定 QUOTES
 *  - 环境变量 TWELVE_DATA_KEY（Secret）
 */

// 自包含的最小 Cloudflare 类型（运行时由 CF 提供；这里仅供本地阅读/类型）。
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
interface Env {
  QUOTES: KVNamespace;
  TWELVE_DATA_KEY: string;
}
type PagesFunction<E> = (context: {
  request: Request;
  env: E;
  waitUntil(promise: Promise<unknown>): void;
}) => Promise<Response>;

interface Quote {
  symbol: string;
  price: number;
  dayChangePct: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 分钟

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const symbols = [
    ...new Set(
      (url.searchParams.get('symbols') ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, 25);

  const now = Date.now();
  const out: Record<string, Quote> = {};
  const stale: string[] = [];

  await Promise.all(
    symbols.map(async (sym) => {
      const raw = await ctx.env.QUOTES.get(`quote:${sym}`);
      if (!raw) return;
      try {
        const cached = JSON.parse(raw) as { t: number; quote: Quote };
        out[sym] = cached.quote;
        if (now - cached.t > TTL_MS) stale.push(sym);
      } catch {
        /* 坏缓存：当作未命中 */
      }
    }),
  );

  // 未命中：同步拉取 + 写缓存
  const misses = symbols.filter((s) => !(s in out));
  if (misses.length) {
    const fresh = await fetchFromProvider(misses, ctx.env);
    for (const [sym, q] of Object.entries(fresh)) {
      out[sym] = q;
      await ctx.env.QUOTES.put(`quote:${sym}`, JSON.stringify({ t: now, quote: q }));
    }
  }

  // 过期：已返回旧值，后台刷新
  if (stale.length) {
    ctx.waitUntil(
      (async () => {
        const fresh = await fetchFromProvider(stale, ctx.env);
        const t = Date.now();
        for (const [sym, q] of Object.entries(fresh)) {
          await ctx.env.QUOTES.put(`quote:${sym}`, JSON.stringify({ t, quote: q }));
        }
      })(),
    );
  }

  return new Response(JSON.stringify(out), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
};

/** 行情源：Twelve Data。封装在此一处，换源（Finnhub/FMP）只改这个函数。 */
async function fetchFromProvider(symbols: string[], env: Env): Promise<Record<string, Quote>> {
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${env.TWELVE_DATA_KEY}`,
  );
  if (!res.ok) return {};
  const data = (await res.json()) as Record<string, unknown>;

  const toQuote = (d: unknown): Quote | null => {
    if (!d || typeof d !== 'object') return null;
    const rec = d as Record<string, unknown>;
    const symbol = String(rec.symbol ?? '').toUpperCase();
    const price = Number(rec.close);
    const pct = Number(rec.percent_change);
    if (!symbol || !Number.isFinite(price) || price <= 0) return null;
    return { symbol, price, dayChangePct: Number.isFinite(pct) ? pct / 100 : 0 };
  };

  const out: Record<string, Quote> = {};
  // 单个代码：Twelve Data 直接返回对象；多个：返回 { SYMBOL: {...} }
  if (symbols.length === 1) {
    const q = toQuote(data);
    if (q) out[q.symbol] = q;
  } else {
    for (const d of Object.values(data)) {
      const q = toQuote(d);
      if (q) out[q.symbol] = q;
    }
  }
  return out;
}
