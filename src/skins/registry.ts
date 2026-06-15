import type { AssetSkin, ThemeSkin } from './types';

/**
 * 皮肤注册表 —— 两类皮肤各一个注册表。
 * 默认皮肤在 themes/ 与 assets/ 中注册；
 * 用户后续可调用 registerTheme / registerAssetSkin 注入自己把关的素材。
 */
const themes = new Map<string, ThemeSkin>();
const assetSkins = new Map<string, AssetSkin>();

export function registerTheme(theme: ThemeSkin): void {
  themes.set(theme.id, theme);
}

export function registerAssetSkin(skin: AssetSkin): void {
  assetSkins.set(skin.id, skin);
}

export function listThemes(): ThemeSkin[] {
  return [...themes.values()];
}

export function listAssetSkins(): AssetSkin[] {
  return [...assetSkins.values()];
}

export function getTheme(id: string): ThemeSkin | undefined {
  return themes.get(id);
}

export function getAssetSkin(id: string): AssetSkin | undefined {
  return assetSkins.get(id);
}

/** 取默认主题（注册的第一个），无则抛错——应至少注册一个 */
export function defaultTheme(): ThemeSkin {
  const first = themes.values().next().value;
  if (!first) throw new Error('没有已注册的主题皮肤');
  return first;
}

export function defaultAssetSkin(): AssetSkin {
  const first = assetSkins.values().next().value;
  if (!first) throw new Error('没有已注册的资产皮肤');
  return first;
}

/** 预加载所有资产皮肤的资源（精灵图等）。引擎在首次 build 前 await。幂等由各皮肤自管。 */
export async function preloadAssetSkins(): Promise<void> {
  await Promise.all([...assetSkins.values()].map((s) => s.load?.()));
}
