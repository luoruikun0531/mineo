import type { Texture } from 'pixi.js';
import { cssHex, makePixelTexture } from './pixel';

/**
 * 平台 SDK · 像素田园通用部件（农民 / 麦子 / 耕地 / 粮袋）。
 * 任何像素皮肤都可复用。约定：在逻辑像素画布上作画（1px = 1 像素块），
 * 农民固定 14×18 逻辑像素——以后 Aseprite 精品按同尺寸导出即可无缝替换。
 */

const C = {
  soil: 0x9c6f43,
  soilDark: 0x7a5532,
  soilLight: 0xb07e4d,
  skin: 0xf0c089,
  hat: 0xe7c66a,
  hatDark: 0xcaa948,
  overalls: 0x466f9e,
  legs: 0x3b5a82,
  tool: 0x9a6a3a,
  toolHead: 0xb9c2c8,
  stalk: 0xb9863f,
  grain: 0xf2c75a,
  grainLight: 0xffe08a,
  sack: 0xd8b06a,
  sackDark: 0xb98c4a,
  star: 0xffd24a,
  white: 0xffffff,
};

type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: number) => {
  ctx.fillStyle = cssHex(color);
  ctx.fillRect(x, y, w, h);
};

type FarmerPose = 'work0' | 'work1' | 'cheer';

function drawFarmer(ctx: Ctx, shirt: number, bob: number, pose: FarmerPose): void {
  const o = bob;
  px(ctx, 3, 17, 8, 1, C.soilDark);
  px(ctx, 4, 13 - o, 2, 4, C.legs);
  px(ctx, 8, 13 - o, 2, 4, C.legs);
  px(ctx, 3, 7 - o, 8, 5, shirt);
  px(ctx, 3, 10 - o, 8, 3, C.overalls);
  px(ctx, 4, 7 - o, 1, 4, C.overalls);
  px(ctx, 9, 7 - o, 1, 4, C.overalls);
  px(ctx, 4, 3 - o, 6, 4, C.skin);
  px(ctx, 2, 2 - o, 10, 1, C.hatDark);
  px(ctx, 4, 0 - o, 6, 2, C.hat);
  px(ctx, 4, 1 - o, 6, 1, C.hat);

  if (pose === 'cheer') {
    px(ctx, 1, 4 - o, 2, 3, shirt);
    px(ctx, 11, 4 - o, 2, 3, shirt);
    px(ctx, 1, 3 - o, 2, 1, C.skin);
    px(ctx, 11, 3 - o, 2, 1, C.skin);
    px(ctx, 0, 2 - o, 1, 1, C.star);
    px(ctx, 13, 2 - o, 1, 1, C.star);
  } else {
    px(ctx, 1, 7 - o, 2, 3, shirt);
    const armY = pose === 'work1' ? 6 - o : 8 - o;
    px(ctx, 11, armY, 2, 3, shirt);
    px(ctx, 12, armY + 3, 1, 1, C.skin);
    const toolTopY = pose === 'work1' ? 2 - o : 5 - o;
    px(ctx, 13, toolTopY, 1, 9, C.tool);
    px(ctx, 12, toolTopY + 9, 3, 1, C.toolHead);
  }
}

function drawLazy(ctx: Ctx, shirt: number, zFrame: number): void {
  px(ctx, 2, 17, 9, 1, C.soilDark);
  px(ctx, 7, 14, 5, 2, C.legs);
  px(ctx, 3, 10, 6, 5, shirt);
  px(ctx, 3, 13, 6, 2, C.overalls);
  px(ctx, 2, 7, 5, 4, C.skin);
  px(ctx, 1, 6, 7, 1, C.hat);
  px(ctx, 2, 5, 5, 1, C.hat);
  px(ctx, 7, 9, 2, 2, shirt);
  const zy = 3 - zFrame;
  px(ctx, 9 + zFrame, zy, 3, 1, C.white);
  px(ctx, 11 + zFrame, zy + 1, 1, 1, C.white);
  px(ctx, 9 + zFrame, zy + 2, 3, 1, C.white);
}

function drawWheat(ctx: Ctx, lean: number): void {
  const cx = 3 + lean;
  px(ctx, cx - 1, 4, 2, 10, C.stalk);
  for (let i = 0; i < 3; i++) {
    const y = 3 - i;
    px(ctx, cx - 2, y, 1, 2, C.grain);
    px(ctx, cx + 1, y, 1, 2, C.grain);
  }
  px(ctx, cx - 1, 0, 2, 2, C.grainLight);
}

/** 锄地农民：idle/work 循环 4 帧 + cheer（丰收）2 帧 */
export function buildFarmerStates(shirt: number): { idle: Texture[]; harvest: Texture[] } {
  return {
    idle: [
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 0, 'work0')),
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 1, 'work1')),
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 0, 'work0')),
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 1, 'work1')),
    ],
    harvest: [
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 1, 'cheer')),
      makePixelTexture(14, 18, (c) => drawFarmer(c, shirt, 0, 'cheer')),
    ],
  };
}

/** 偷懒农民：2 帧（z 飘动） */
export function buildLazyFrames(shirt: number): Texture[] {
  return [0, 1].map((z) => makePixelTexture(14, 18, (c) => drawLazy(c, shirt, z)));
}

/** 麦子 2 帧（左右摆） */
export function buildWheatFrames(): Texture[] {
  return [0, 1].map((lean) => makePixelTexture(7, 14, (c) => drawWheat(c, lean)));
}

/** 一块耕地：44×26 逻辑像素 */
export function buildGroundTexture(): Texture {
  return makePixelTexture(44, 26, (ctx) => {
    px(ctx, 0, 2, 44, 24, C.soil);
    px(ctx, 0, 0, 44, 2, C.soilLight);
    for (let r = 0; r < 4; r++) px(ctx, 2, 6 + r * 5, 40, 1, C.soilDark);
    for (const [x, y] of [[6, 9], [30, 14], [18, 20], [38, 7]] as const) {
      px(ctx, x, y, 1, 1, C.soilDark);
    }
  });
}

export function buildSackTexture(): Texture {
  return makePixelTexture(10, 9, (ctx) => {
    px(ctx, 1, 1, 8, 8, C.sack);
    px(ctx, 1, 1, 8, 1, C.sackDark);
    px(ctx, 3, 0, 4, 1, C.sackDark);
    px(ctx, 4, 3, 2, 1, C.sackDark);
  });
}
