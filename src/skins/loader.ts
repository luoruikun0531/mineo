import type { AssetSkin, ThemeSkin } from './types';
import { registerAssetSkin, registerTheme } from './registry';

/**
 * 皮肤自动发现：扫描 themes/* 与 assets/* 下每个文件夹的 index.ts，
 * 取其 default 导出（皮肤清单）注册之。
 * —— 丢进一个文件夹（含 index.ts 默认导出皮肤）即多一个皮肤，无需改任何中心文件。
 * 以 `_` 开头的文件夹（如 _template）被忽略。
 */
export function loadAllSkins(): void {
  const themeModules = import.meta.glob<{ default: ThemeSkin }>(
    './themes/*/index.ts',
    { eager: true },
  );
  for (const [path, mod] of Object.entries(themeModules)) {
    if (isIgnored(path)) continue;
    if (mod.default) registerTheme(mod.default);
  }

  const assetModules = import.meta.glob<{ default: AssetSkin }>(
    './assets/*/index.ts',
    { eager: true },
  );
  for (const [path, mod] of Object.entries(assetModules)) {
    if (isIgnored(path)) continue;
    if (mod.default) registerAssetSkin(mod.default);
  }
}

function isIgnored(path: string): boolean {
  return path.split('/').some((seg) => seg.startsWith('_'));
}
