import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from '@/engine/GameCanvas';
import { TopBar } from '@/ui/TopBar';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { AssetModal } from '@/ui/AssetModal';
import { SettingsModal } from '@/ui/SettingsModal';
import { applyUITokens } from '@/ui/applyTheme';
import { LanguageProvider, useLanguage, useT } from '@/i18n';
import { defaultTheme, ensureSkinsInstalled, getTheme, initSkins, listThemes } from '@/skins';
import { isWidgetMode, useGameStore } from '@/state/store';
import { cloudEnabled } from '@/sync/cloud';
import { WidgetSettings } from '@/widget/WidgetSettings';
import {
  loadWidgetPrefs,
  saveWidgetPrefs,
  type WidgetPrefs,
} from '@/widget/prefs';
import { displaySymbol, formatAmount } from '@/domain/currency';
import type { Asset } from '@/domain/types';

type ModalState =
  | { type: 'none' }
  | { type: 'asset'; editing: Asset | null }
  | { type: 'settings' };

/** 主题色 token 应用（full 与 widget 共用） */
function useThemeTokens(themeId: string) {
  useEffect(() => {
    const theme = getTheme(themeId) ?? defaultTheme();
    applyUITokens(theme.ui);
  }, [themeId]);
}

/**
 * 确保当前选择（主题 + 各资产皮肤）已装到本地；缺的自动从 Registry 下载。
 * 用于挂件/web 端镜像同步来的、本地还没有的皮肤。
 * 下到新皮肤后只「触碰」assets 触发棋盘重建（相机平滑跟随，不重挂画布）。
 */
function useEnsureSelectionSkins(): void {
  const themeId = useGameStore((s) => s.themeId);
  const iconKey = useGameStore((s) =>
    [...new Set(s.assets.map((a) => a.iconId))].sort().join('|'),
  );
  useEffect(() => {
    let alive = true;
    const ids = [themeId, ...iconKey.split('|')].filter(Boolean);
    if (ids.length === 0) return;
    void ensureSkinsInstalled(ids).then((changed) => {
      if (alive && changed) {
        useGameStore.setState((s) => ({ assets: s.assets.slice() }));
      }
    });
    return () => {
      alive = false;
    };
  }, [themeId, iconKey]);
}

/** 底部添加按钮（空地图时附引导） */
function AddBar({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  const empty = useGameStore((s) => s.assets.length === 0);
  return (
    <div className="add-bar">
      {empty && <span className="add-bar__hint">{t('asset.addFirst')}</span>}
      <button className="add-asset-fab" type="button" onClick={onAdd}>
        ＋ {t('asset.add')}
      </button>
    </div>
  );
}

/** 离线挂机收益提示 */
function OfflineToast() {
  const { language } = useLanguage();
  const gain = useGameStore((s) => s.offlineGain);
  const settings = useGameStore((s) => s.settings);
  const clear = useGameStore((s) => s.clearOfflineGain);

  useEffect(() => {
    if (gain > 0) {
      const timer = setTimeout(clear, 6000);
      return () => clearTimeout(timer);
    }
  }, [gain, clear]);

  if (gain <= 0) return null;
  const amount = `+${formatAmount(gain)} ${displaySymbol(settings)}`;
  const text =
    language === 'zh' ? `🌙 离线收成 ${amount}` : `🌙 Welcome back! ${amount}`;
  return (
    <button className="offline-toast" type="button" onClick={clear}>
      {text}
    </button>
  );
}

/** 完整 web 端（可编辑/设置/换肤） */
function FullApp() {
  const themeId = useGameStore((s) => s.themeId);
  const setThemeId = useGameStore((s) => s.setThemeId);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  useThemeTokens(themeId);
  useEnsureSelectionSkins();

  useEffect(() => {
    if (!themeId) {
      const first = listThemes()[0];
      if (first) setThemeId(first.id);
    }
  }, [themeId, setThemeId]);

  const onUnitTap = useCallback((id: string) => {
    const a = useGameStore.getState().assets.find((x) => x.id === id) ?? null;
    setModal({ type: 'asset', editing: a });
  }, []);
  const close = useCallback(() => setModal({ type: 'none' }), []);

  return (
    <div className="app">
      <GameCanvas onUnitTap={onUnitTap} />
      <TopBar onSettings={() => setModal({ type: 'settings' })} />
      <ThemeSwitcher activeThemeId={themeId} onChange={setThemeId} />
      <AddBar onAdd={() => setModal({ type: 'asset', editing: null })} />
      <OfflineToast />
      {modal.type === 'asset' && <AssetModal editing={modal.editing} onClose={close} />}
      {modal.type === 'settings' && <SettingsModal onClose={close} />}
    </div>
  );
}

/** 配对屏：云同步已开启但还没配对码时，让用户输入 web 端的配对码。 */
function WidgetPairScreen() {
  const t = useT();
  const setSyncCode = useGameStore((s) => s.setSyncCode);
  const [code, setCode] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (c.length >= 4) setSyncCode(c);
  };

  return (
    <div className="widget widget--pair">
      <form className="pair" onSubmit={submit}>
        <h2 className="pair__title">{t('sync.enterTitle')}</h2>
        <p className="pair__hint">{t('sync.enterHint')}</p>
        <input
          className="pair__input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoFocus
        />
        <button className="btn btn--primary" type="submit" disabled={code.trim().length < 4}>
          {t('sync.connect')}
        </button>
      </form>
    </div>
  );
}

/** 桌面 widget：只读展示——第一行收成，下面只显示格子区。数据从 web 端同步。 */
function WidgetApp() {
  const themeId = useGameStore((s) => s.themeId);
  const ledger = useGameStore((s) => s.ledger);
  const settings = useGameStore((s) => s.settings);
  const syncCode = useGameStore((s) => s.syncCode);
  const t = useT();
  useThemeTokens(themeId);
  const sym = displaySymbol(settings);
  useEnsureSelectionSkins();

  const [prefs, setPrefs] = useState<WidgetPrefs>(loadWidgetPrefs);
  const updatePrefs = useCallback((patch: Partial<WidgetPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveWidgetPrefs(next);
      return next;
    });
  }, []);

  // 云同步已配置但尚未配对：先让用户输入配对码
  if (cloudEnabled() && !syncCode) return <WidgetPairScreen />;

  return (
    <div className="widget">
      {/* 滤镜层：透明度 + 黑白只作用于收成条与农场，设置控件在层外保持清晰 */}
      <div
        className="widget-fx"
        style={{
          opacity: prefs.opacity,
          filter: prefs.grayscale ? 'grayscale(1)' : undefined,
        }}
      >
        {/* 顶部收成条同时充当拖动把手（Tauri 无边框窗口） */}
        <div className="widget-totals" data-tauri-drag-region>
          <div className="widget-stat">
            <span className="widget-stat__label">☀ {t('hud.today')}</span>
            <span className="widget-stat__value">
              +{formatAmount(ledger.today)} {sym}
            </span>
          </div>
          <div className="widget-stat">
            <span className="widget-stat__label">{t('hud.total')}</span>
            <span className="widget-stat__value">
              +{formatAmount(ledger.cumulative)} {sym}
            </span>
          </div>
        </div>
        <div className="widget-stage">
          <GameCanvas widget />
        </div>
      </div>
      <WidgetSettings prefs={prefs} onChange={updatePrefs} />
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  padding: '0 24px',
  textAlign: 'center',
  fontFamily: 'ui-monospace, monospace',
  color: '#7a4e25',
};

/** 皮肤就绪门控：先 await initSkins()（本地库空则自动下默认）再渲染，避免无皮肤渲染。 */
function SkinGate({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    initSkins()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch((e: unknown) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div style={loadingStyle}>
        {(language === 'zh' ? '皮肤加载失败：' : 'Skin load failed: ') + error}
      </div>
    );
  }
  if (!ready) {
    return <div style={loadingStyle}>{language === 'zh' ? '正在准备皮肤…' : 'Preparing skins…'}</div>;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <LanguageProvider>
      <SkinGate>{isWidgetMode() ? <WidgetApp /> : <FullApp />}</SkinGate>
    </LanguageProvider>
  );
}
