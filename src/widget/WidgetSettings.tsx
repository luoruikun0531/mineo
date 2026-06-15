import { useState } from 'react';
import { useT } from '@/i18n';
import { OPACITY_MAX, OPACITY_MIN, type WidgetPrefs } from './prefs';

interface WidgetSettingsProps {
  prefs: WidgetPrefs;
  onChange: (patch: Partial<WidgetPrefs>) => void;
}

/**
 * 挂件右上角的小齿轮 + 滤镜面板（透明度 / 黑白）。
 * 故意放在滤镜层之外——这样调到很透明/黑白时，控件本身仍清晰可操作。
 */
export function WidgetSettings({ prefs, onChange }: WidgetSettingsProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="widget-tools">
      <button
        className="widget-gear"
        type="button"
        aria-label={t('widget.settings')}
        title={t('widget.settings')}
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open && (
        <div className="widget-panel">
          <label className="widget-panel__row">
            <span>{t('widget.opacity')}</span>
            <input
              type="range"
              min={OPACITY_MIN}
              max={OPACITY_MAX}
              step={0.05}
              value={prefs.opacity}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            />
            <span className="widget-panel__val">
              {Math.round(prefs.opacity * 100)}%
            </span>
          </label>
          <label className="widget-panel__row widget-panel__row--check">
            <span>{t('widget.grayscale')}</span>
            <input
              type="checkbox"
              checked={prefs.grayscale}
              onChange={(e) => onChange({ grayscale: e.target.checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
