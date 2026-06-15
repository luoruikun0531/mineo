import { openDB, type IDBPDatabase } from 'idb';
import type { AssetManifest, ThemeManifest } from '../format/manifest';

/**
 * 本地皮肤库（IndexedDB）。下载来的图片皮肤包存这里，渲染只从本地读。
 *  - web 端与桌面挂件各有自己的 IndexedDB（隔离）；各自按需下载、各自缓存。
 *  - 一个包 = manifest + 全部 PNG 的 Blob，按 id 主键存。
 */
export interface StoredPackage {
  id: string;
  kind: 'asset' | 'theme';
  version: string;
  manifest: AssetManifest | ThemeManifest;
  /** 帧名 → PNG Blob。 */
  blobs: Record<string, Blob>;
}

const DB_NAME = 'mineo-skins';
const STORE = 'packages';

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbp;
}

export async function putPackage(pkg: StoredPackage): Promise<void> {
  await (await db()).put(STORE, pkg);
}

export async function getPackage(id: string): Promise<StoredPackage | undefined> {
  return (await db()).get(STORE, id) as Promise<StoredPackage | undefined>;
}

export async function getAllPackages(): Promise<StoredPackage[]> {
  return (await db()).getAll(STORE) as Promise<StoredPackage[]>;
}

export async function hasPackage(id: string): Promise<boolean> {
  return (await (await db()).getKey(STORE, id)) !== undefined;
}

export async function deletePackage(id: string): Promise<void> {
  await (await db()).delete(STORE, id);
}

export async function packageCount(): Promise<number> {
  return (await db()).count(STORE);
}
