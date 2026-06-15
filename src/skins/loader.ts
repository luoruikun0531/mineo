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
import {
  getAssetSkin,
  getTheme,
  preloadAssetSkins,
  registerAssetSkin,
  registerTheme,
} from './registry';
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

/**
 * 确保给定皮肤 id（当前选择：主题 + 各资产 iconId）都已注册可用；
 * 未注册的从 Registry 下载安装（用于挂件/web 端镜像同步来的、本地还没有的皮肤）。
 * 返回是否有新装（调用方据此决定是否重建画布）。
 */
export async function ensureSkinsInstalled(ids: string[]): Promise<boolean> {
  const missing = [...new Set(ids)].filter((id) => id && !getAssetSkin(id) && !getTheme(id));
  if (missing.length === 0) return false;

  const registry = await fetchRegistry();
  let changed = false;
  for (const id of missing) {
    const entry = registry.skins.find((s) => s.id === id);
    if (!entry) continue;
    try {
      await installAndRegisterSkin(entry);
      changed = true;
    } catch {
      /* 离线/缺失：跳过该皮肤，不阻塞其它 */
    }
  }
  return changed;
}
