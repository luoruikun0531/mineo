import { create } from 'zustand';
import type { Asset, Ledger, Settings } from '@/domain/types';
import { productivityRate } from '@/domain/earnings';
import { buildAsset, type AssetInput } from '@/domain/assetInput';
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
 * 应用状态（MVP）。
 * 资产数量驱动地图格子数；收成账本由引擎在每次丰收时累加。
 * 持久化到 localStorage；重新打开时按离线时长补发挂机收益。
 */
interface GameStore {
  assets: Asset[];
  themeId: string;
  settings: Settings;
  ledger: Ledger;
  /** 本次启动补发的离线收益（>0 时 App 弹一次提示，然后清零） */
  offlineGain: number;
  setThemeId: (id: string) => void;
  /** 录入：新增资产 */
  addAsset: (input: AssetInput) => void;
  /** 录入：编辑资产（保留 id/createdAt/cell） */
  updateAsset: (id: string, input: AssetInput) => void;
  /** 删除资产 */
  removeAsset: (id: string) => void;
  /** 修改全局设置（货币/隐私/金币比例） */
  updateSettings: (patch: Partial<Settings>) => void;
  addHarvest: (amount: number) => void;
  resetLedger: () => void;
  clearOfflineGain: () => void;
  /** widget：从快照同步（web 端编辑后实时反映），不计离线、不回存 */
  hydrate: (snap: Snapshot) => void;
  /** 云同步配对码（6 位）。web 端生成，桌面 widget 输入同一码即可拉取。 */
  syncCode: string;
  /** 设置配对码（持久化；widget 模式下会立即拉取一次） */
  setSyncCode: (code: string) => void;
}

const OFFLINE_CAP_SEC = 7 * 24 * 3600; // 离线补发上限 7 天

function dateKey(d = new Date()): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'a-' + Math.floor(performance.now() * 1000);
}

const initialLedger = (): Ledger => ({
  cumulative: 0,
  today: 0,
  todayDateKey: dateKey(),
  countingSince: Date.now(),
});

const defaultSettings = (): Settings => ({
  currency: 'CNY',
  language: 'zh',
  privacyMode: false,
});

interface InitState {
  assets: Asset[];
  themeId: string;
  settings: Settings;
  ledger: Ledger;
  offlineGain: number;
}

/** 从快照恢复 + 计算离线挂机收益 */
function initFromSnapshot(): InitState {
  const snap = loadSnapshot();
  if (!snap) {
    return {
      assets: [],
      themeId: '',
      settings: defaultSettings(),
      ledger: initialLedger(),
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
  const key = dateKey(new Date(now));
  const sameDay = snap.ledger.todayDateKey === key;
  return {
    assets: snap.assets,
    themeId: snap.themeId || '',
    settings: { ...defaultSettings(), ...snap.settings },
    ledger: {
      cumulative: snap.ledger.cumulative + offline,
      today: (sameDay ? snap.ledger.today : 0) + offline,
      todayDateKey: key,
      countingSince: snap.ledger.countingSince,
    },
    offlineGain: elapsed > 60 ? offline : 0,
  };
}

const init = initFromSnapshot();

export const useGameStore = create<GameStore>((set) => ({
  assets: init.assets,
  themeId: init.themeId,
  settings: init.settings,
  ledger: init.ledger,
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
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  addHarvest: (amount) =>
    set((s) => {
      const key = dateKey();
      const sameDay = s.ledger.todayDateKey === key;
      return {
        ledger: {
          cumulative: s.ledger.cumulative + amount,
          today: (sameDay ? s.ledger.today : 0) + amount,
          todayDateKey: key,
          countingSince: s.ledger.countingSince,
        },
      };
    }),
  resetLedger: () => set({ ledger: initialLedger() }),
  clearOfflineGain: () => set({ offlineGain: 0 }),
  hydrate: (snap) =>
    set({
      assets: snap.assets,
      settings: { ...defaultSettings(), ...snap.settings },
      themeId: snap.themeId || '',
      ledger: snap.ledger,
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
  const snap: Snapshot = {
    assets: s.assets,
    settings: s.settings,
    themeId: s.themeId,
    ledger: s.ledger,
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
  }
}

/** 资产数 → 方格边长 n（2×2 起步，满了扩大） */
export function gridNFor(count: number): number {
  return Math.max(2, Math.ceil(Math.sqrt(Math.max(1, count))));
}
