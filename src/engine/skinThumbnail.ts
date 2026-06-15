import { Application, Container } from 'pixi.js';
import { getAssetSkin, preloadAssetSkins } from '@/skins';

/**
 * 把一个资产皮肤渲染成缩略图 dataURL（用于录入时的皮肤选择器）。
 * 共用一个离屏渲染器，按 skinId 缓存。失败时返回 null（UI 回退到名字）。
 */
let appPromise: Promise<Application> | null = null;
const cache = new Map<string, string>();

async function getApp(): Promise<Application> {
  if (!appPromise) {
    const app = new Application();
    appPromise = app
      .init({ width: 128, height: 128, backgroundAlpha: 0, antialias: false })
      .then(() => app);
  }
  return appPromise;
}

export async function renderSkinThumbnail(
  skinId: string,
  size = 112,
): Promise<string | null> {
  const cached = cache.get(skinId);
  if (cached) return cached;

  const skin = getAssetSkin(skinId);
  if (!skin) return null;

  try {
    await preloadAssetSkins();
    const app = await getApp();
    const holder = new Container();
    const handle = skin.build({ tileSize: size });
    handle.view.position.set(64, 80); // 居中（单位多为底部锚点，略微下移）
    holder.addChild(handle.view);
    app.stage.addChild(holder);
    app.renderer.render(app.stage);
    const url = await app.renderer.extract.base64(app.stage);
    app.stage.removeChild(holder);
    handle.destroy?.();
    holder.destroy({ children: true });
    cache.set(skinId, url);
    return url;
  } catch {
    return null;
  }
}
