import { useLanguage, useT } from '@/i18n';
import type { Language } from '@/domain/types';
import { useGameStore } from '@/state/store';
import { displaySymbol, formatAmount } from '@/domain/currency';

/**
 * 顶部 HUD：本日收成 / 累积收成（实时跳动）+ 清零 + 语言切换。
 * 数值来自 store.ledger，由引擎每次丰收累加。
 */
interface TopBarProps {
  onSettings: () => void;
}

export function TopBar({ onSettings }: TopBarProps) {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const ledger = useGameStore((s) => s.ledger);
  const settings = useGameStore((s) => s.settings);
  const resetLedger = useGameStore((s) => s.resetLedger);
  const sym = displaySymbol(settings);

  const onReset = () => {
    const msg =
      language === 'zh'
        ? '确定清零本日/累积收成并重新开始累积吗？'
        : 'Reset today & total harvest and start over?';
    if (window.confirm(msg)) resetLedger();
  };

  return (
    <header className="top-bar">
      <div className="harvest-stat">
        <span className="harvest-stat__label">☀ {t('hud.today')}</span>
        <span className="harvest-stat__value">
          +{formatAmount(ledger.today)} {sym}
        </span>
      </div>
      <div className="harvest-stat">
        <span className="harvest-stat__label">{t('hud.total')}</span>
        <span className="harvest-stat__value">
          +{formatAmount(ledger.cumulative)} {sym}
        </span>
      </div>
      <button className="hud-btn" type="button" onClick={onReset}>
        ↺ {t('hud.reset')}
      </button>
      <button className="hud-btn" type="button" onClick={onSettings}>
        ⚙ {t('hud.settings')}
      </button>
      <LanguageToggle language={language} onChange={setLanguage} />
    </header>
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
