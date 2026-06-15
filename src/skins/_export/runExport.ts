import {
  allBuiltPackages,
  allBuildingPackages,
  allBuiltThemePackages,
  allStockPackages,
} from './packages';

/**
 * DEV-only：把所有程序化皮肤渲染成 PNG，POST 到 vite 插件落盘到 public/skins/<id>/。
 * 仅供开发期在浏览器里手动触发（动态 import 调用），不被 app 引用、不进生产包。
 * 用法（preview 控制台 / eval）：
 *   (await import('/src/skins/_export/runExport.ts')).runSkinExport()
 */
async function post(id: string, manifest: unknown, images: Record<string, string>): Promise<unknown> {
  try {
    const res = await fetch('/__export_skin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, manifest, images }),
    });
    return { id, ...(await res.json()) };
  } catch (error) {
    return { id, ok: false, error: String(error) };
  }
}

export async function runSkinExport(): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const p of [...allBuiltPackages(), ...allBuildingPackages()]) {
    results.push(await post(p.id, p.manifest, p.images));
  }
  for (const s of allStockPackages()) {
    results.push(await post(s.pkg.id, s.pkg.manifest, s.pkg.images));
  }
  for (const t of allBuiltThemePackages()) {
    results.push(await post(t.id, t.manifest, t.images));
  }
  return results;
}
