import { Texture } from 'pixi.js';

/**
 * 平台 SDK · 像素贴图工具。
 * 在一张【逻辑像素尺寸】的 canvas 上作画（1 canvas px = 1 像素块），
 * 返回最近邻缩放的 Texture——这是"像素风皮肤"的标准做法：
 * 低分辨率源贴图 + nearest 放大 = 硬边像素。
 *
 * 约定：同一皮肤里所有元素都按"每格 tile = ART_GRID 个逻辑像素"来作画并缩放，
 * 这样拼出来的场景共享同一套像素网格，颗粒一致。
 */
export function makePixelTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
  }
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/** 十六进制色号转 CSS（给 canvas 用） */
export function cssHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
