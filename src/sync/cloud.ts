import type { Snapshot } from '@/persistence/local';

/**
 * 云同步（Supabase REST）。
 * web 端按「配对码」把快照 upsert 到云；桌面挂件按同一配对码读云。
 * 未配置环境变量时 cloudEnabled() 为 false，全部降级为本地（不影响现状）。
 *
 * 需要的环境变量（.env）：VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
 * 云端表（SQL 见 docs/09-DESKTOP.md）：farm_states(code text pk, data jsonb, updated_at timestamptz)
 */
const BASE = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = 'farm_states';

export function cloudEnabled(): boolean {
  return Boolean(BASE && ANON);
}

function headers(extra?: Record<string, string>): Record<string, string> {
  // 新版 publishable key（sb_publishable_...）只能走 apikey；放进 Authorization
  // 会被平台当成非法 JWT 拒绝。旧版 anon key 是 JWT（eyJ... 开头），需同时放进 Authorization。
  const isLegacyJwt = Boolean(ANON && ANON.startsWith('eyJ'));
  return {
    apikey: ANON ?? '',
    ...(isLegacyJwt ? { Authorization: `Bearer ${ANON}` } : {}),
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** web 端：按配对码 upsert 快照到云。失败静默（本地仍在）。 */
export async function pushState(code: string, snapshot: Snapshot): Promise<void> {
  if (!cloudEnabled() || !code) return;
  try {
    await fetch(`${BASE}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify({
        code,
        data: snapshot,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    /* 离线：忽略 */
  }
}

/** 挂件：按配对码从云读取快照。无数据/失败返回 null。 */
export async function pullState(code: string): Promise<Snapshot | null> {
  if (!cloudEnabled() || !code) return null;
  try {
    const res = await fetch(
      `${BASE}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(code)}&select=data`,
      { headers: headers() },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ data: Snapshot }>;
    return rows[0]?.data ?? null;
  } catch {
    return null;
  }
}
