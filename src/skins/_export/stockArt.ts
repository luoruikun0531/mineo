import { Texture } from 'pixi.js';
import { makePixelTexture } from '../kit';

/**
 * 构建期：5 个示例股票的「占位」像素美术（反映各家 logo/业务）+ 7 档涨跌指示。
 * 真·AI 美术由用户用图片生产 API 生成后替换（沙箱无网，此处生不了）。
 */
export type StockCompany = 'apple' | 'nvidia' | 'tesla' | 'microsoft' | 'amazon';

type Ctx = CanvasRenderingContext2D;
const fill = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// ---- 公司 logo（占位像素，~22×22）----
function appleLogo(): Texture {
  return makePixelTexture(22, 24, (ctx) => {
    fill(ctx, 4, 9, 14, 10, '#2b2b2b');
    fill(ctx, 5, 6, 12, 13, '#2b2b2b');
    fill(ctx, 9, 2, 2, 4, '#5a4a2a'); // 梗
    fill(ctx, 11, 3, 4, 3, '#3a7d3a'); // 叶
    ctx.clearRect(16, 9, 4, 6); // 右侧缺口
  });
}
function microsoftLogo(): Texture {
  return makePixelTexture(22, 22, (ctx) => {
    fill(ctx, 3, 3, 7, 7, '#f25022');
    fill(ctx, 12, 3, 7, 7, '#7fba00');
    fill(ctx, 3, 12, 7, 7, '#00a4ef');
    fill(ctx, 12, 12, 7, 7, '#ffb900');
  });
}
function amazonLogo(): Texture {
  return makePixelTexture(24, 22, (ctx) => {
    fill(ctx, 5, 3, 14, 11, '#232f3e');
    fill(ctx, 8, 6, 8, 6, '#37475a'); // 'a' 占位
    fill(ctx, 4, 16, 15, 2, '#ff9900'); // 橙色微笑
    fill(ctx, 16, 14, 3, 2, '#ff9900');
    fill(ctx, 15, 18, 3, 2, '#ff9900');
  });
}
function nvidiaLogo(): Texture {
  return makePixelTexture(24, 20, (ctx) => {
    fill(ctx, 4, 7, 16, 6, '#76b900');
    fill(ctx, 8, 4, 9, 12, '#76b900');
    ctx.clearRect(10, 8, 4, 4);
    fill(ctx, 11, 9, 2, 2, '#0b3d00');
  });
}
function teslaLogo(): Texture {
  return makePixelTexture(20, 24, (ctx) => {
    fill(ctx, 3, 4, 14, 3, '#e31937');
    fill(ctx, 8, 4, 4, 17, '#e31937');
  });
}

const LOGO: Record<StockCompany, () => Texture> = {
  apple: appleLogo,
  microsoft: microsoftLogo,
  amazon: amazonLogo,
  nvidia: nvidiaLogo,
  tesla: teslaLogo,
};

// ---- 涨跌指示（7 档：N 个上/下三角，绿涨红跌，plain 一横）----
function triUp(ctx: Ctx, cx: number, c: string) {
  fill(ctx, cx - 3, 7, 6, 1, c);
  fill(ctx, cx - 2, 5, 4, 2, c);
  fill(ctx, cx - 1, 3, 2, 2, c);
}
function triDown(ctx: Ctx, cx: number, c: string) {
  fill(ctx, cx - 3, 3, 6, 1, c);
  fill(ctx, cx - 2, 4, 4, 2, c);
  fill(ctx, cx - 1, 6, 2, 2, c);
}
function indicator(dir: 'up' | 'down' | 'flat', n: number): Texture {
  return makePixelTexture(30, 11, (ctx) => {
    if (dir === 'flat') {
      fill(ctx, 11, 5, 8, 2, '#9a8f80');
      return;
    }
    const c = dir === 'up' ? '#2e9e4f' : '#d0402f';
    const start = 15 - (n - 1) * 5;
    for (let i = 0; i < n; i++) {
      (dir === 'up' ? triUp : triDown)(ctx, start + i * 10, c);
    }
  });
}

/** 一个股票皮肤的全部贴图：logo + 7 档涨跌指示（帧名与 manifest 对应）。 */
export function stockTextures(company: StockCompany): Record<string, Texture> {
  return {
    logo: LOGO[company](),
    up3: indicator('up', 3),
    up2: indicator('up', 2),
    up1: indicator('up', 1),
    plain: indicator('flat', 0),
    down1: indicator('down', 1),
    down2: indicator('down', 2),
    down3: indicator('down', 3),
  };
}
