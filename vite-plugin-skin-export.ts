import type { Plugin } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

/**
 * DEV-only 插件：接收浏览器导出的皮肤包，写到 public/skins/<id>/。
 *
 * 用于把"程序化老皮肤渲染出的 PNG"一次性落盘成图片皮肤包（manifest.json + *.png）。
 * 仅在 `vite serve`（开发）生效，不进生产构建（apply:'serve'）。
 * POST /__export_skin  body: { id, manifest, images:{name:dataURL} }
 */
export function skinExportPlugin(): Plugin {
  return {
    name: 'mineo-skin-export',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__export_skin', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          void handle(body, res);
        });
      });
    },
  };
}

async function handle(body: string, res: import('node:http').ServerResponse): Promise<void> {
  try {
    const { id, manifest, images } = JSON.parse(body) as {
      id: string;
      manifest: unknown;
      images: Record<string, string>;
    };
    const safeId = String(id).replace(/[^a-z0-9-]/gi, '');
    if (!safeId) throw new Error('invalid skin id');

    const dir = fileURLToPath(new URL(`./public/skins/${safeId}`, import.meta.url));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    let pngs = 0;
    for (const [name, dataUrl] of Object.entries(images)) {
      const safeName = name.replace(/[^a-z0-9_-]/gi, '');
      const base64 = String(dataUrl).split(',')[1] ?? '';
      await writeFile(path.join(dir, `${safeName}.png`), Buffer.from(base64, 'base64'));
      pngs += 1;
    }

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, dir: `public/skins/${safeId}`, pngs }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
}
