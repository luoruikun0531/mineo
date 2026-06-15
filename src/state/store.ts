import { create } from 'zustand';
import type { Asset, Settings, ValueSnapshot } from '@/domain/types';
import { productivityRate, totalValue } from '@/domain/earnings';
import { appendSnapshot } from '@/domain/metrics';
import { buildAsset, type AssetInput } from '@/domain/assetInput';
import { fetchQuotes } from '@/market/quotes';
import type { Quote } from '@/market/types';
import {
  getSyncCode,
  loadSnapshot,
  makeSyncCode,
  saveSnapshot,
  setSyncCode as persistSyncCode,
  STORAGE_KEY,
  type Snapshot,
} from '@/persistence/local';
import { cloudEnabled, pullState, pushState } from '@/sync/cloud';

/** 桌面 widget（只读展示）模式：URL ?mode=widget */
export function isWidgetMode(): boolean {
  return (
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('mode') === 'widget'
  );
}

/**
 * 应用状态。
 * 资产归一化为 value + productivityPerSecond；总价值随时间确定式累积。
 * 总览指标（总价值/一日·一月生产力/进度）由总价值 + 价值快照算出。
 */
interface GameStore {
  assets: Asset[];
  themeId: string;
  settings: Settings;
  /** 总价值快照（每 ~30 分钟一条，供一日/一月生产力）。 */
  valueSnapshots: ValueSnapshot[];
  /** 本次启动期间累积的离线收益（>0 时 App 弹一次提示，然后清零） */
  offlineGain: number;
  setThemeId: (id: string) => void;
  addAsset: (input: AssetInput) => void;
  updateAsset: (id: string, input: AssetInput) => void;
  removeAsset: (id: string) => void;
  /** 重置：清空所有资产与价值历史（保留货币/目标等设置与主题）。 */
  resetAll: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** 投资资产：套用行情刷新（latestPrice/dayChangePct → value）。 */
  applyQuotes: (quotes: Record<string, Quote>) => void;
  clearOfflineGain: () => void;
  /** widget：从快照同步（web 端编辑后实时反映），不计离线、不回存 */
  hydrate: (snap: Snapshot) => void;
  syncCode: string;
  setSyncCode: (code: string) => void;
}

const OFFLINE_CAP_SEC = 7 * 24 * 3600; // 离线补发上限 7 天
const SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000; // 每 30 分钟取一次总价值快照

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'a-' + Math.floor(performance.now() * 1000);
}

const defaultSettings = (): Settings => ({
  currency: 'CNY',
  language: 'zh',
  privacyMode: false,
  goalValue: 1_000_000,
});

interface InitState {
  assets: Asset[];
  themeId: string;
  settings: Settings;
  valueSnapshots: ValueSnapshot[];
  offlineGain: number;
}

/** 从快照恢复 + 估算离线期间累积的收益（仅用于提示；价值本身确定式累积，无需补发）。 */
function initFromSnapshot(): InitState {
  const snap = loadSnapshot();
  if (!snap) {
    return {
      assets: [],
      themeId: '',
      settings: defaultSettings(),
      valueSnapshots: [],
      offlineGain: 0,
    };
  }
  const now = Date.now();
  const elapsed = Math.max(0, Math.min((now - snap.savedAt) / 1000, OFFLINE_CAP_SEC));
  let offline = 0;
  for (const a of snap.assets) {
    try {
      offline += Math.floor(productivityRate(a, snap.settings) * elapsed);
    } catch {
      // 跳过无法计算的资产
    }
  }
  return {
    assets: snap.assets,
    themeId: snap.themeId || '',
    settings: { ...defaultSettings(), ...snap.settings },
    valueSnapshots: snap.valueSnapshots ?? [],
    offlineGain: elapsed > 60 ? offline : 0,
  };
}

const init = initFromSnapshot();

export const useGameStore = create<GameStore>((set) => ({
  assets: init.assets,
  themeId: init.themeId,
  settings: init.settings,
  valueSnapshots: init.valueSnapshots,
  offlineGain: init.offlineGain,
  syncCode: getSyncCode(),
  setThemeId: (id) => set({ themeId: id }),
  addAsset: (input) =>
    set((s) => ({
      assets: [...s.assets, buildAsset(input, makeId(), Date.now())],
    })),
  updateAsset: (id, input) =>
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === id
          ? buildAsset(input, a.id, Date.now(), { createdAt: a.createdAt, cell: a.cell, prev: a })
          : a,
      ),
    })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
  resetAll: () => set({ assets: [], valueSnapshots: [], offlineGain: 0 }),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  applyQuotes: (quotes) =>
    set((s) => ({
      assets: s.assets.map((a) => {
        if (a.kind !== 'investment') return a;
        const q = quotes[a.symbol];
        if (!q || q.price <= 0) return a;
        if (a.latestPrice === q.price && a.dayChangePct === q.dayChangePct) return a;
        return { ...a, latestPrice: q.price, unitValue: q.price, dayChangePct: q.dayChangePct };
      }),
    })),
  clearOfflineGain: () => set({ offlineGain: 0 }),
  hydrate: (snap) =>
    set({
      assets: snap.assets,
      settings: { ...defaultSettings(), ...snap.settings },
      themeId: snap.themeId || '',
      valueSnapshots: snap.valueSnapshots ?? [],
    }),
  setSyncCode: (code) => {
    const c = code.trim().toUpperCase();
    persistSyncCode(c);
    set({ syncCode: c });
    if (isWidgetMode() && c && cloudEnabled()) {
      void pullState(c).then((snap) => {
        if (snap) useGameStore.getState().hydrate(snap);
      });
    }
  },
}));

// ---- 持久化：节流保存 + 退出前保存 ----
let lastSave = 0;
let pending = false;
function doSave(): void {
  lastSave = Date.now();
  const s = useGameStore.getState();

  // 每 ~30 分钟取一次总价值快照（持久化，供一日/一月生产力）
  let snapshots = s.valueSnapshots;
  const last = snapshots[snapshots.length - 1];
  if (!last || lastSave - last.t >= SNAPSHOT_INTERVAL_MS) {
    snapshots = appendSnapshot(snapshots, lastSave, totalValue(s.assets, lastSave));
    useGameStore.setState({ valueSnapshots: snapshots });
  }

  const snap: Snapshot = {
    assets: s.assets,
    settings: s.settings,
    themeId: s.themeId,
    valueSnapshots: snapshots,
    savedAt: lastSave,
  };
  saveSnapshot(snap);
  if (cloudEnabled() && s.syncCode) void pushState(s.syncCode, snap);
}
function scheduleSave(): void {
  const now = Date.now();
  if (now - lastSave > 3000) {
    doSave();
  } else if (!pending) {
    pending = true;
    setTimeout(
      () => {
        pending = false;
        doSave();
      },
      3000 - (now - lastSave),
    );
  }
}
if (typeof window !== 'undefined') {
  if (isWidgetMode()) {
    // widget：只读展示。优先云同步轮询；同源（同一浏览器）场景下也监听 storage 兜底。
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const snap = loadSnapshot();
      if (snap) useGameStore.getState().hydrate(snap);
    });
    if (cloudEnabled()) {
      const poll = async (): Promise<void> => {
        const code = useGameStore.getState().syncCode;
        if (!code) return;
        const snap = await pullState(code);
        if (snap) useGameStore.getState().hydrate(snap);
      };
      void poll();
      setInterval(() => void poll(), 4000);
    }
  } else {
    // web 端：开启云同步时确保已有配对码（供设置面板展示给桌面 widget 输入）
    if (cloudEnabled() && !useGameStore.getState().syncCode) {
      const code = makeSyncCode();
      persistSyncCode(code);
      useGameStore.setState({ syncCode: code });
    }
    useGameStore.subscribe(scheduleSave);
    window.addEventListener('beforeunload', doSave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') doSave();
    });

    // 投资资产：定期刷新行情（每 5 分钟；后端 cache-aside，只查请求过的代码）
    const refreshQuotes = async (): Promise<void> => {
      const symbols = useGameStore
        .getState()
        .assets.filter((a) => a.kind === 'investment')
        .map((a) => a.symbol);
      if (symbols.length === 0) return;
      try {
        const quotes = await fetchQuotes(symbols);
        useGameStore.getState().applyQuotes(quotes);
      } catch {
        /* 离线/后端不可用：忽略，保留上次价格 */
      }
    };
    void refreshQuotes();
    setInterval(() => void refreshQuotes(), 5 * 60 * 1000);
  }
}

/** 资产数 → 方格边长 n（2×2 起步，满了扩大） */
export function gridNFor(count: number): number {
  return Math.max(2, Math.ceil(Math.sqrt(Math.max(1, count))));
}
