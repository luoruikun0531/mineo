import { assetFrameNames, parseAssetManifest } from '../format/manifest';
import { interpretAssetSkin } from './interpretAsset';
import type { AssetSkin } from '../types';

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
