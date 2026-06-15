import { useState } from 'react';
import { useGameStore } from '@/state/store';
import { useT } from '@/i18n';
import { CURRENCIES } from '@/domain/types';
import { CURRENCY_SYMBOL, GOLD_SYMBOL } from '@/domain/currency';
import { cloudEnabled } from '@/sync/cloud';
import { Modal } from './Modal';

interface SettingsModalProps {
  onClose: () => void;
}

/** 全局设置：货币（唯一）、隐私模式、金币兑换比例。改动实时生效。 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const t = useT();
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const syncCode = useGameStore((s) => s.syncCode);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    try {
      navigator.clipboard?.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默；配对码本身仍然可见可手动输入
    }
  };

  return (
    <Modal
      title={t('settings.title')}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn--primary" type="button" onClick={onClose}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t('settings.currency')}</label>
        <div className="seg seg--wrap">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              className={settings.currency === c ? 'is-active' : ''}
              onClick={() => updateSettings({ currency: c })}
            >
              {CURRENCY_SYMBOL[c]} {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={settings.privacyMode}
            onChange={(e) =>
              updateSettings({
                privacyMode: e.target.checked,
                goldRate: settings.goldRate ?? 10,
              })
            }
          />
          {t('settings.privacy')}
        </label>
        <p className="hint">{t('settings.privacyHint')}</p>
      </div>

      {settings.privacyMode && (
        <div className="field">
          <label>{t('settings.goldRate')}</label>
          <div className="goldrate">
            <span className="goldrate__unit">1 {CURRENCY_SYMBOL[settings.currency]}</span>
            <span className="goldrate__eq">=</span>
            <input
              inputMode="numeric"
              value={String(settings.goldRate ?? 10)}
              onChange={(e) =>
                updateSettings({
                  goldRate: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                })
              }
            />
            <span className="goldrate__coin">{GOLD_SYMBOL}</span>
          </div>
          <p className="hint">{t('settings.goldRateHint')}</p>
        </div>
      )}

      {cloudEnabled() && syncCode && (
        <div className="field">
          <label>{t('sync.title')} · {t('sync.code')}</label>
          <div className="sync-code">
            <code className="sync-code__value">{syncCode}</code>
            <button type="button" className="btn" onClick={copyCode}>
              {copied ? t('sync.copied') : t('sync.copy')}
            </button>
          </div>
          <p className="hint">{t('sync.hint')}</p>
        </div>
      )}
    </Modal>
  );
}
