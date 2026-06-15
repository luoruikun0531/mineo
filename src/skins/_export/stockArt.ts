import { Texture } from 'pixi.js';
import { makePixelTexture } from '../kit';

/**
 * 构建期：投资类皮肤的两块可复用美术 ——
 *  1) 公司 logo「招牌」（挂在写字楼顶，作代码专属皮肤的标识）。
 *  2) 7 档涨跌指示箭头（办公室/工厂/股票皮肤共用，quote 行为切片段）。
 * 真·AI 美术由用户用图片生产 API 生成后替换 PNG 即可。
 */
export type StockCompany = 'apple' | 'nvidia' | 'tesla' | 'microsoft' | 'amazon';

type Ctx = CanvasRenderingContext2D;
const fill = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

/** 招牌底板（浅色面板 + 立柱），glyph 画在其上，挂楼顶很显眼。 */
function logoSign(draw: (ctx: Ctx) => void): Texture {
  return makePixelTexture(26, 20, (ctx) => {
    fill(ctx, 1, 0, 24, 16, '#f6f3ec');
    fill(ctx, 1, 0, 24, 1, '#ffffff');
    fill(ctx, 1, 15, 24, 1, '#cdc5b4');
    fill(ctx, 1, 0, 1, 16, '#e3ddcd');
    fill(ctx, 24, 0, 1, 16, '#cdc5b4');
    fill(ctx, 12, 16, 2, 4, '#9aa0a8'); // post
    draw(ctx);
  });
}

function appleLogo(): Texture {
  return logoSign((ctx) => {
    const b = '#1d1d1f';
    fill(ctx, 16, 2, 1, 3, '#5a7d3a'); // stem
    fill(ctx, 17, 2, 3, 2, '#6fae3f'); // leaf
    // rounded apple body
    fill(ctx, 9, 6, 9, 8, b);
    fill(ctx, 8, 7, 11, 6, b);
    fill(ctx, 10, 5, 3, 1, b);
    fill(ctx, 14, 5, 3, 1, b);
    fill(ctx, 10, 13, 2, 1, b);
    fill(ctx, 15, 13, 2, 1, b);
    ctx.clearRect(17, 7, 2, 4); // bite
  });
}
function microsoftLogo(): Texture {
  return logoSign((ctx) => {
    fill(ctx, 7, 3, 5, 5, '#f25022');
    fill(ctx, 13, 3, 5, 5, '#7fba00');
    fill(ctx, 7, 9, 5, 5, '#00a4ef');
    fill(ctx, 13, 9, 5, 5, '#ffb900');
  });
}
function amazonLogo(): Texture {
  return logoSign((ctx) => {
    fill(ctx, 6, 4, 13, 2, '#232f3e');
    fill(ctx, 6, 4, 2, 6, '#232f3e');
    fill(ctx, 17, 4, 2, 6, '#232f3e');
    fill(ctx, 9, 7, 7, 3, '#232f3e'); // 'a'
    fill(ctx, 5, 11, 15, 2, '#ff9900'); // smile
    fill(ctx, 18, 9, 2, 2, '#ff9900');
    fill(ctx, 17, 12, 3, 2, '#ff9900'); // arrow tip
  });
}
function nvidiaLogo(): Texture {
  return logoSign((ctx) => {
    const g = '#76b900';
    fill(ctx, 6, 6, 14, 6, g);
    fill(ctx, 9, 4, 10, 10, g);
    ctx.clearRect(11, 7, 5, 4);
    fill(ctx, 12, 8, 3, 2, '#0b3d00'); // eye
  });
}
function teslaLogo(): Texture {
  return logoSign((ctx) => {
    const r = '#e31937';
    fill(ctx, 5, 4, 14, 2, r); // top bar
    fill(ctx, 11, 4, 2, 10, r); // stem
    fill(ctx, 8, 5, 2, 1, r);
    fill(ctx, 14, 5, 2, 1, r);
  });
}

const LOGO: Record<StockCompany, () => Texture> = {
  apple: appleLogo,
  microsoft: microsoftLogo,
  amazon: amazonLogo,
  nvidia: nvidiaLogo,
  tesla: teslaLogo,
};

/** 公司 logo 招牌纹理。 */
export function companyLogo(company: StockCompany): Texture {
  return LOGO[company]();
}

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

/** 7 档涨跌箭头纹理（帧名与 quote clips 的键对应）。 */
export function arrowTextures(): Record<string, Texture> {
  return {
    up3: indicator('up', 3),
    up2: indicator('up', 2),
    up1: indicator('up', 1),
    plain: indicator('flat', 0),
    down1: indicator('down', 1),
    down2: indicator('down', 2),
    down3: indicator('down', 3),
  };
}
