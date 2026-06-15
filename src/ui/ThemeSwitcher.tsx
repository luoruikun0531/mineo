import { useState } from 'react';
import { listThemes } from '@/skins';
import { useLanguage } from '@/i18n';

interface ThemeSwitcherProps {
  activeThemeId: string;
  onChange: (themeId: string) => void;
}

/**
 * 主界面的"土地+UI 皮肤"切换按钮。
 * 列出已注册主题；用户后续注册的素材皮肤会自动出现在这里。
 */
export function ThemeSwitcher({ activeThemeId, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const themes = listThemes();
  const active = themes.find((t) => t.id === activeThemeId);

  return (
    <div className="theme-switcher">
      {open && (
        <div className="theme-switcher__menu" role="menu">
          <div className="theme-switcher__title">
            {language === 'zh' ? '土地 / UI 皮肤' : 'Land / UI Skin'}
          </div>
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={
                'theme-switcher__item' +
                (theme.id === activeThemeId ? ' is-active' : '')
              }
              onClick={() => {
                onChange(theme.id);
                setOpen(false);
              }}
            >
              <span
                className="theme-switcher__swatch"
                style={{ background: theme.ui.panel }}
              />
              {theme.name[language]}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="theme-switcher__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        🎨 {active ? active.name[language] : '—'}
      </button>
    </div>
  );
}
