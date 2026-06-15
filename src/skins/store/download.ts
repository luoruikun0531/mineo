import {
  assetFrameNames,
  parseAssetManifest,
  parseThemeManifest,
  themeFrameNames,
} from '../format/manifest';
import type { AssetKind, Language } from '@/domain/types';
import { putPackage, type StoredPackage } from './db';

/**
 * 皮肤适用范围：决定该皮肤在哪些资产的「外观」选择里出现。
 *  - 缺省（无 scope）：通用，所有类别可选。
 *  - kinds：只对这些资产类别可选（如 ['cashflow']、['investment']）。
 *  - symbols：投资专属代码皮肤（如 ['AAPL']），仅该代码的投资可选。
 */
export interface SkinScope {
  kinds?: AssetKind[];
  symbols?: string[];
}

/** Registry 中的一条皮肤记录。 */
export interface RegistryEntry {
  id: string;
  kind: 'asset' | 'theme';
  name: Record<Language, string>;
  version: string;
  /** 包基址：`/skins/<id>`（同源静态）或远端 URL。 */
  base: string;
  /** 适用范围（缺省=通用）。 */
  scope?: SkinScope;
}

/** 该皮肤是否适用于给定资产（类别 + 可选代码）。 */
export function skinAppliesTo(
  scope: SkinScope | undefined,
  kind: AssetKind,
  symbol?: string,
): boolean {
  if (!scope) return true;
  if (scope.symbols && scope.symbols.length > 0) {
    return kind === 'investment' && !!symbol && scope.symbols.includes(symbol.toUpperCase());
  }
  if (scope.kinds && scope.kinds.length > 0) return scope.kinds.includes(kind);
  return true;
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
    return { id: entry.id, kind: 'asset', version: entry.version, manifest, blobs };
  }

  const manifest = parseThemeManifest(raw);
  await Promise.all(
    themeFrameNames.map(async (n) => {
      blobs[n] = await fetchBlob(`${base}/${n}.png`);
    }),
  );
  return { id: entry.id, kind: 'theme', version: entry.version, manifest, blobs };
}

/** 安装（下载 + 入库）。 */
export async function installPackage(entry: RegistryEntry): Promise<StoredPackage> {
  const pkg = await downloadPackage(entry);
  await putPackage(pkg);
  return pkg;
}

/**
 * 与 Registry 对齐本地库（每次启动调用）：
 *  - 补齐缺失的默认皮肤（包括「新增」的默认，如后加的银行/别墅/办公室/工厂）；
 *  - 升级版本已变化的「已安装」皮肤（含非默认，如代码专属股票皮肤升版）。
 * `stored` 传入已读出的本地包（拿版本，免重复读库）。离线时各步吞错，不阻塞启动。
 * 返回有变化（新装/升级）的 id 列表。
 */
export async function syncWithRegistry(
  registry: Registry,
  stored: StoredPackage[],
): Promise<string[]> {
  const installedVersion = new Map(stored.map((p) => [p.id, p.version]));
  const ids = new Set<string>([...registry.defaults, ...installedVersion.keys()]);
  const changed: string[] = [];
  for (const id of ids) {
    const entry = registry.skins.find((s) => s.id === id);
    if (!entry) continue;
    if (installedVersion.get(id) === entry.version) continue; // 已是最新
    try {
      await installPackage(entry); // 缺装 / 升级（putPackage 覆盖）
      changed.push(id);
    } catch {
      /* 离线/缺失：跳过该皮肤，不阻塞其它 */
    }
  }
  return changed;
}
