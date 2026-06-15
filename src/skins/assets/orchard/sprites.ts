import type { Texture } from 'pixi.js';
import { cssHex, makePixelTexture } from '../../kit';

/** 果园皮肤私有像素美术：草地 / 果树 / 果筐。 */

const C = {
  grass: 0x8fb85a,
  grassDark: 0x7aa64c,
  grassLight: 0xa8c66c,
  trunk: 0x8a5a34,
  trunkDark: 0x6f4a2c,
  leaf: 0x568a3c,
  leafLight: 0x6fae4f,
  crate: 0xb9844a,
  crateDark: 0x8c6233,
  white: 0xffffff,
};

type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: number) => {
  ctx.fillStyle = cssHex(color);
  ctx.fillRect(x, y, w, h);
};

/** 草地：44×26 逻辑像素 */
export function buildGrassTexture(): Texture {
  return makePixelTexture(44, 26, (ctx) => {
    px(ctx, 0, 2, 44, 24, C.grass);
    px(ctx, 0, 0, 44, 2, C.grassLight);
    for (const [x, y] of [[5, 8], [14, 16], [26, 10], [34, 19], [20, 22]] as const) {
      px(ctx, x, y, 2, 1, C.grassDark);
      px(ctx, x, y - 1, 1, 1, C.grassLight);
    }
  });
}

/** 果树 2 帧（树冠左右轻摆）。18×22 逻辑像素，锚点底部。 */
export function buildFruitTreeFrames(fruit: number): Texture[] {
  return [0, 1].map((lean) =>
    makePixelTexture(18, 22, (ctx) => {
      // 树干
      px(ctx, 8, 14, 3, 8, C.trunkDark);
      px(ctx, 8, 14, 2, 8, C.trunk);
      const o = lean;
      // 树冠（块状像素）
      px(ctx, 3 + o, 5, 12, 8, C.leaf);
      px(ctx, 5 + o, 3, 8, 3, C.leaf);
      px(ctx, 4 + o, 6, 10, 4, C.leafLight);
      px(ctx, 6 + o, 2, 4, 2, C.leafLight);
      // 果子
      for (const [fx, fy] of [[5, 7], [11, 6], [8, 10], [13, 9], [3, 9]] as const) {
        px(ctx, fx + o, fy, 2, 2, fruit);
        px(ctx, fx + o, fy, 1, 1, C.white);
      }
    }),
  );
}

/** 果筐（带果子）：12×9 逻辑像素 */
export function buildCrateTexture(fruit: number): Texture {
  return makePixelTexture(12, 9, (ctx) => {
    px(ctx, 1, 2, 10, 7, C.crate);
    px(ctx, 1, 2, 10, 1, C.crateDark);
    px(ctx, 3, 4, 3, 1, C.crateDark);
    px(ctx, 7, 4, 3, 1, C.crateDark);
    px(ctx, 3, 0, 2, 2, fruit);
    px(ctx, 6, 0, 2, 2, fruit);
    px(ctx, 4, 1, 1, 1, C.white);
  });
}
