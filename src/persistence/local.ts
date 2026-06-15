import type { Asset, Settings, ValueSnapshot } from '@/domain/types';

/** 本地持久化快照（localStorage）。带 savedAt 以便计算离线挂机收益。 */
// v2: 资产模型归一化（value/productivityPerSecond + 4 类）；旧 v1 数据自动失效（pre-launch 重置）。
export const STORAGE_KEY = 'mineo:v2';
const KEY = STORAGE_KEY;

export interface Snapshot {
  assets: Asset[];
  settings: Settings;
  themeId: string;
  valueSnapshots: ValueSnapshot[];
  savedAt: number;
}

export function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Snapshot;
    if (!s || !Array.isArray(s.assets) || !s.settings) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSnapshot(snap: Snapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // 配额/序列化错误：忽略（内存态仍在）
  }
}

// ---- 云同步「配对码」----
const CODE_KEY = 'mineo:synccode';

export function getSyncCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setSyncCode(code: string): void {
  try {
    localStorage.setItem(CODE_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

/** 生成 6 位易读配对码（去掉易混字符） */
export function makeSyncCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}
