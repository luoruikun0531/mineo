import type { Texture } from 'pixi.js';
import { getAllPackages, type StoredPackage } from './store/db';
import {
  fetchRegistry,
  installDefaults,
  installPackage,
  type RegistryEntry,
} from './store/download';
import { interpretAssetSkin } from './runtime/interpretAsset';
import { interpretThemeSkin } from './runtime/interpretTheme';
import { loadTexture } from './runtime/texture';
import { preloadAssetSkins, registerAssetSkin, registerTheme } from './registry';
import { themeFrameNames, type AssetManifest, type ThemeManifest } from './format/manifest';

/** 把本地库里的一个包解释并注册进皮肤注册表。 */
async function registerStored(pkg: StoredPackage): Promise<void> {
  const urls: Record<string, string> = {};
  for (const [name, blob] of Object.entries(pkg.blobs)) {
    urls[name] = URL.createObjectURL(blob);
  }

  if (pkg.kind === 'asset') {
    // 资产皮肤：load() 由引擎 preloadAssetSkins 统一 await
    registerAssetSkin(interpretAssetSkin(pkg.manifest as AssetManifest, urls));
    return;
  }

  // 主题：无 load 钩子、buildLand 同步，故先预解码纹理再 interpret
  const manifest = pkg.manifest as ThemeManifest;
  const tex: Record<string, Texture> = {};
  await Promise.all(
    themeFrameNames.map(async (name) => {
      if (urls[name]) tex[name] = await loadTexture(urls[name], manifest.pixelated);
    }),
  );
  registerTheme(interpretThemeSkin(manifest, tex));
}

/**
 * 从本地库加载并注册所有已安装皮肤。空库则先从 Registry 装默认集。
 * 取代旧的 import.meta.glob 程序化加载——运行时只认图片包（本地化）。
 */
export async function loadSkinsFromStore(): Promise<void> {
  let packages = await getAllPackages();
  if (packages.length === 0) {
    const registry = await fetchRegistry();
    await installDefaults(registry);
    packages = await getAllPackages();
  }
  for (const pkg of packages) {
    await registerStored(pkg);
  }
}

/**
 * 按需下载并注册一个皮肤（供「皮肤商店」的下载按钮用）：
 * 下载 → 入库 → 解释注册；资产皮肤顺带预加载纹理，使其立即可用/可缩略图。
 */
export async function installAndRegisterSkin(entry: RegistryEntry): Promise<void> {
  const pkg = await installPackage(entry);
  await registerStored(pkg);
  if (pkg.kind === 'asset') await preloadAssetSkins();
}
