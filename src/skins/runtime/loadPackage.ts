import { Texture } from 'pixi.js';
import {
  assetFrameNames,
  parseAssetManifest,
  parseThemeManifest,
  themeFrameNames,
} from '../format/manifest';
import { interpretAssetSkin } from './interpretAsset';
import { interpretThemeSkin } from './interpretTheme';
import { loadTexture } from './texture';
import type { AssetSkin, ThemeSkin } from '../types';

/**
 * 从一个「包基址」加载图片资产皮肤。
 *  - baseUrl 例：`/skins/orchard`（web 端静态）或 registry 上的远端地址。
 *  - 取 manifest.json → 校验 → 帧名映射到 `<base>/<帧名>.png` → 解释成 AssetSkin。
 *  - 不在此调用 load()（引擎会在 preloadAssetSkins 时统一 await）。
 */
export async function loadAssetPackage(baseUrl: string): Promise<AssetSkin> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/manifest.json`);
  if (!res.ok) throw new Error(`skin manifest ${base} -> HTTP ${res.status}`);
  const manifest = parseAssetManifest(await res.json());

  const images: Record<string, string> = {};
  for (const name of assetFrameNames(manifest)) {
    images[name] = `${base}/${name}.png`;
  }
  return interpretAssetSkin(manifest, images);
}

/**
 * 从一个「包基址」加载图片主题皮肤。
 *  - 主题（ThemeSkin）无 load 钩子、buildLand 是同步的，
 *    故在此**预解码**全部固定命名纹理（themeFrameNames）后再 interpret。
 */
export async function loadThemePackage(baseUrl: string): Promise<ThemeSkin> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/manifest.json`);
  if (!res.ok) throw new Error(`theme manifest ${base} -> HTTP ${res.status}`);
  const manifest = parseThemeManifest(await res.json());

  const tex: Record<string, Texture> = {};
  await Promise.all(
    themeFrameNames.map(async (name) => {
      tex[name] = await loadTexture(`${base}/${name}.png`, manifest.pixelated);
    }),
  );
  return interpretThemeSkin(manifest, tex);
}
