import { useLanguage, useT } from '@/i18n';
import type { Language } from '@/domain/types';
import { useGameStore } from '@/state/store';
import { displaySymbol, displayValue, formatAmount } from '@/domain/currency';
import { totalValue } from '@/domain/earnings';
import { dailyProductivity, monthlyProductivity, progressToGoal } from '@/domain/metrics';
import { useNow } from './useNow';

/**
 * 顶部总览：总价值 / 一日生产力 / 一月生产力 / 总价值进度（实时跳动）+ 设置 + 语言。
 * 数值由资产的归一化 value/productivity + 价值快照算出（见 domain/metrics）。
 */
interface TopBarProps {
  onSettings: () => void;
}

export function TopBar({ onSettings }: TopBarProps) {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const assets = useGameStore((s) => s.assets);
  const settings = useGameStore((s) => s.settings);
  const snapshots = useGameStore((s) => s.valueSnapshots);
  const now = useNow();
  const sym = displaySymbol(settings);

  const total = displayValue(totalValue(assets, now), settings);
  const daily = displayValue(dailyProductivity(assets, snapshots, now), settings);
  const monthly = displayValue(monthlyProductivity(assets, snapshots, now), settings);
  const progress = progressToGoal(assets, now, settings.goalValue);
  const pct = Math.round(progress * 100);

  const signed = (v: number) => (v >= 0 ? '+' : '−') + formatAmount(Math.abs(v));

  return (
    <header className="top-bar">
      <Stat label={`💎 ${t('hud.totalValue')}`} value={`${formatAmount(total)} ${sym}`} />
      <Stat label={`☀ ${t('hud.daily')}`} value={`${signed(daily)} ${sym}`} />
      <Stat label={`🌙 ${t('hud.monthly')}`} value={`${signed(monthly)} ${sym}`} />
      <div className="harvest-stat harvest-stat--progress">
        <span className="harvest-stat__label">🎯 {t('hud.progress')}</span>
        <div className="goal-bar">
          <div className="goal-bar__fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
        <span className="harvest-stat__value">{pct}%</span>
      </div>
      <button className="hud-btn" type="button" onClick={onSettings}>
        ⚙ {t('hud.settings')}
      </button>
      <LanguageToggle language={language} onChange={setLanguage} />
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="harvest-stat">
      <span className="harvest-stat__label">{label}</span>
      <span className="harvest-stat__value">{value}</span>
    </div>
  );
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div className="lang-toggle">
      <button
        type="button"
        className={language === 'en' ? 'is-active' : ''}
        onClick={() => onChange('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={language === 'zh' ? 'is-active' : ''}
        onClick={() => onChange('zh')}
      >
        中
      </button>
    </div>
  );
}
