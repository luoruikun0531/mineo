import { Texture } from 'pixi.js';

/**
 * 通用纹理加载：<img> + onload，兼容 data: / blob: / 普通路径。
 *  - Pixi 的 Assets.load 靠扩展名识别类型，对无扩展名的 data/blob URL 会失败；
 *  - img.decode() 在部分无头/不渲染环境会挂起不返回，故用 onload。
 */
export async function loadTexture(src: string, pixelated: boolean): Promise<Texture> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`skin image failed to load: ${src.slice(0, 64)}`));
    img.src = src;
  });
  const tex = Texture.from(img);
  tex.source.scaleMode = pixelated ? 'nearest' : 'linear';
  return tex;
}
