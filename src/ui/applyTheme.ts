import type { UITokens } from '@/skins';

/** 把主题 UI token 写入 :root CSS 变量，驱动 HUD 外观。 */
export function applyUITokens(ui: UITokens): void {
  const root = document.documentElement.style;
  root.setProperty('--sky-top', ui.skyTop);
  root.setProperty('--sky-bottom', ui.skyBottom);
  root.setProperty('--panel', ui.panel);
  root.setProperty('--panel-border', ui.panelBorder);
  root.setProperty('--highlight', ui.highlight);
  root.setProperty('--ink', ui.ink);
  root.setProperty('--harvest-text', ui.harvestText);
  if (ui.fontFamily) {
    root.setProperty('--font-family', ui.fontFamily);
  }
}
