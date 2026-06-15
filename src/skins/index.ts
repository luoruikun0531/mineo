import { loadSkinsFromStore } from './loader';

let initPromise: Promise<void> | null = null;

/**
 * 初始化皮肤系统：从本地 IndexedDB 库加载并注册所有图片皮肤包；
 * 本地库为空时自动从 Registry 下载默认集。幂等——多次调用返回同一个 promise。
 * 应用根处 await 它完成后再渲染（见 App 的 SkinGate）。
 */
export function initSkins(): Promise<void> {
  if (!initPromise) initPromise = loadSkinsFromStore();
  return initPromise;
}

export { ensureSkinsInstalled, installAndRegisterSkin } from './loader';
export { fetchRegistry, type Registry, type RegistryEntry } from './store/download';
export * from './types';
export * from './registry';
