import type { Quote } from './types';

/**
 * 批量查行情。前端只打自家 `/api/quotes`：
 *  - dev：Vite mock 插件返回假价格（vite-plugin-quotes-mock.ts）。
 *  - prod：Cloudflare Pages Function（functions/api/quotes.ts）走 cache-aside + Twelve Data。
 */
export async function fetchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (list.length === 0) return {};
  const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(list.join(','))}`);
  if (!res.ok) throw new Error(`quotes -> HTTP ${res.status}`);
  return (await res.json()) as Record<string, Quote>;
}

/** 查单个代码；查不到（无价格）返回 null。供录入时"查价"按钮拦截无效代码。 */
export async function lookupQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  try {
    const map = await fetchQuotes([sym]);
    const q = map[sym];
    return q && q.price > 0 ? q : null;
  } catch {
    return null;
  }
}
