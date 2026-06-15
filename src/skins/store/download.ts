import {
  assetFrameNames,
  parseAssetManifest,
  parseThemeManifest,
  themeFrameNames,
} from '../format/manifest';
import type { Language } from '@/domain/types';
import { hasPackage, putPackage, type StoredPackage } from './db';

/** Registry 中的一条皮肤记录。 */
export interface RegistryEntry {
  id: string;
  kind: 'asset' | 'theme';
  name: Record<Language, string>;
  version: string;
  /** 包基址：`/skins/<id>`（同源静态）或远端 URL。 */
  base: string;
}

/** Registry：可用皮肤清单 + 默认集。 */
export interface Registry {
  skins: RegistryEntry[];
  defaults: string[];
}

const REGISTRY_URL = '/skins/registry.json';

/** 拉取 Registry 清单（失败抛出）。 */
export async function fetchRegistry(url = REGISTRY_URL): Promise<Registry> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`registry ${url} -> HTTP ${res.status}`);
  return res.json() as Promise<Registry>;
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`skin asset ${url} -> HTTP ${res.status}`);
  return res.blob();
}

/** 下载一个包：manifest + 全部 PNG（→ Blob）。不入库。 */
export async function downloadPackage(entry: RegistryEntry): Promise<StoredPackage> {
  const base = entry.base.replace(/\/$/, '');
  const res = await fetch(`${base}/manifest.json`);
  if (!res.ok) throw new Error(`skin manifest ${base} -> HTTP ${res.status}`);
  const raw: unknown = await res.json();
  const blobs: Record<string, Blob> = {};

  if (entry.kind === 'asset') {
    const manifest = parseAssetManifest(raw);
    await Promise.all(
      assetFrameNames(manifest).map(async (n) => {
        blobs[n] = await fetchBlob(`${base}/${n}.png`);
      }),
    );
    return { id: entry.id, kind: 'asset', version: manifest.version, manifest, blobs };
  }

  const manifest = parseThemeManifest(raw);
  await Promise.all(
    themeFrameNames.map(async (n) => {
      blobs[n] = await fetchBlob(`${base}/${n}.png`);
    }),
  );
  return { id: entry.id, kind: 'theme', version: manifest.version, manifest, blobs };
}

/** 安装（下载 + 入库）。 */
export async function installPackage(entry: RegistryEntry): Promise<StoredPackage> {
  const pkg = await downloadPackage(entry);
  await putPackage(pkg);
  return pkg;
}

/** 确保给定 id 都已在本地库；缺的从 registry 下载安装。返回新装的 id 列表。 */
export async function ensureInstalled(ids: string[], registry: Registry): Promise<string[]> {
  const installed: string[] = [];
  for (const id of ids) {
    if (await hasPackage(id)) continue;
    const entry = registry.skins.find((s) => s.id === id);
    if (!entry) continue;
    await installPackage(entry);
    installed.push(id);
  }
  return installed;
}

/** 本地库为空时装默认集（registry.defaults）。 */
export async function installDefaults(registry: Registry): Promise<string[]> {
  return ensureInstalled(registry.defaults, registry);
}
