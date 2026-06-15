import type { Texture } from 'pixi.js';
import { makePixelTexture, buildFarmerStates } from '../kit';
import { buildFruitTreeFrames } from '../assets/orchard/sprites';
import { arrowTextures, companyLogo, type StockCompany } from './stockArt';

/**
 * 构建期：四类「建筑」皮肤的程序化像素美术 + 导出。
 *  - 存款=银行、房产=别墅（有进度条/金币，工人会丰收欢呼）。
 *  - 投资默认=办公室/工厂、股票=写字楼+招牌（quote 模式，无进度条，箭头按 7 档切）。
 * 动效全靠：多帧循环（旋转金币/闪烁窗/烟囱烟/水波/齿轮）+ 解释器的环境动作（breathe/sway）。
 * 落盘为 PNG 图片包后，运行时只读图片；真·AI 美术替换 PNG 即可。
 */
type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
const pngOf = (tex: Texture): string =>
  (tex.source.resource as HTMLCanvasElement).toDataURL('image/png');

/** 向上收窄的台阶式三角（屋顶/山墙）。base 在 baseY，向上 height 行。 */
function tri(ctx: Ctx, cx: number, baseY: number, halfW: number, height: number, c: string) {
  for (let r = 0; r < height; r++) {
    const w = Math.max(1, Math.round(halfW * 2 * ((height - r) / height)));
    px(ctx, cx - Math.round(w / 2), baseY - r, w, 1, c);
  }
}

// ============================ 银行（存款）============================
function buildPlaza(): Texture {
  return makePixelTexture(44, 26, (ctx) => {
    px(ctx, 0, 0, 44, 26, '#c3b99f'); // 整格石板地坪
    px(ctx, 0, 0, 44, 2, '#d4caaf');
    for (let x = 0; x < 44; x += 7) px(ctx, x, 0, 1, 26, '#aca288'); // 竖缝
    for (let y = 0; y < 26; y += 7) px(ctx, 0, y, 44, 1, '#aca288'); // 横缝
    px(ctx, 0, 25, 44, 1, '#968c76');
  });
}
function buildBankBody(): Texture {
  return makePixelTexture(40, 38, (ctx) => {
    px(ctx, 3, 33, 34, 4, '#cfc6b0'); // steps
    px(ctx, 5, 31, 30, 2, '#ddd4be');
    px(ctx, 7, 16, 26, 16, '#ece3cd'); // wall
    px(ctx, 7, 16, 26, 1, '#fff7e6');
    px(ctx, 7, 30, 26, 2, '#d6cbb0');
    for (const x of [9, 15, 21, 27]) {
      px(ctx, x, 17, 4, 14, '#ddd2b6'); // columns
      px(ctx, x, 17, 1, 14, '#fff7e6');
      px(ctx, x + 3, 17, 1, 14, '#c2b694');
    }
    px(ctx, 5, 13, 30, 3, '#e3d8bc'); // entablature
    px(ctx, 5, 13, 30, 1, '#fff7e6');
    tri(ctx, 20, 13, 16, 9, '#c7a86f'); // pediment
    tri(ctx, 20, 12, 12, 6, '#d8bd87');
    px(ctx, 17, 22, 6, 9, '#5b3f26'); // door
    px(ctx, 18, 23, 4, 8, '#7a5836');
    px(ctx, 18, 6, 4, 4, '#f4c542'); // coin emblem
    px(ctx, 19, 7, 2, 2, '#a9760f');
  });
}
function buildCoinFrames(): Texture[] {
  return [10, 6, 2, 6].map((w) =>
    makePixelTexture(12, 14, (ctx) => {
      const cx = 6;
      px(ctx, cx - w / 2, 2, w, 10, '#f4c542');
      px(ctx, cx - w / 2, 2, w, 1, '#fff1b0');
      px(ctx, cx - w / 2, 11, w, 1, '#c8941f');
      if (w >= 6) {
        px(ctx, cx - 1, 4, 2, 6, '#a9760f');
        px(ctx, cx - 2, 5, 4, 1, '#a9760f');
        px(ctx, cx - 2, 7, 4, 1, '#a9760f');
      }
    }),
  );
}
function buildSignFrames(): Texture[] {
  return [true, false].map((on) =>
    makePixelTexture(16, 9, (ctx) => {
      px(ctx, 0, 1, 16, 7, '#28304a');
      px(ctx, 0, 1, 16, 1, '#3c466a');
      const c = on ? '#ffd34d' : '#5d6450';
      px(ctx, 7, 2, 2, 5, c); // ¥
      px(ctx, 5, 2, 2, 1, c);
      px(ctx, 9, 2, 2, 1, c);
      px(ctx, 5, 4, 6, 1, c);
      px(ctx, 5, 6, 6, 1, c);
    }),
  );
}
export function exportBank(): Record<string, string> {
  const out: Record<string, string> = {};
  out.plaza = pngOf(buildPlaza());
  out.building = pngOf(buildBankBody());
  buildCoinFrames().forEach((t, k) => (out[`coin_${k}`] = pngOf(t)));
  buildSignFrames().forEach((t, k) => (out[`sign_${k}`] = pngOf(t)));
  const clerk = buildFarmerStates(0x3a5a86);
  clerk.idle.forEach((t, k) => (out[`clerk_idle_${k}`] = pngOf(t)));
  clerk.harvest.forEach((t, k) => (out[`clerk_harvest_${k}`] = pngOf(t)));
  return out;
}

// ============================ 别墅（房产）============================
function buildLawn(): Texture {
  return makePixelTexture(44, 26, (ctx) => {
    px(ctx, 0, 0, 44, 26, '#9ccc5a'); // 整格草坪
    px(ctx, 0, 0, 44, 2, '#b6e070');
    for (let x = 2; x < 44; x += 5)
      for (let y = 3; y < 25; y += 6) px(ctx, x, y, 1, 2, '#84b84a'); // 草簇铺满
    px(ctx, 0, 25, 44, 1, '#7fae48');
  });
}
function buildVillaHouse(): Texture {
  return makePixelTexture(42, 36, (ctx) => {
    px(ctx, 8, 14, 26, 19, '#f0e6d2'); // body
    px(ctx, 8, 14, 26, 1, '#fff8ea');
    px(ctx, 8, 31, 26, 2, '#d8ccb2');
    px(ctx, 4, 22, 8, 11, '#e0c4a0'); // left wing
    px(ctx, 4, 22, 8, 1, '#f2dcbe');
    tri(ctx, 21, 14, 16, 8, '#b5563e'); // roof
    px(ctx, 6, 14, 30, 1, '#9a4632');
    px(ctx, 3, 22, 10, 2, '#9a4632'); // wing roof
    for (const [wx, wy] of [
      [12, 17],
      [24, 17],
      [12, 24],
    ]) {
      px(ctx, wx, wy, 6, 6, '#7fc6e0');
      px(ctx, wx, wy, 6, 1, '#bfe6f2');
      px(ctx, wx + 2, wy, 1, 6, '#4f93b0');
      px(ctx, wx, wy + 2, 6, 1, '#4f93b0');
    }
    px(ctx, 23, 24, 6, 9, '#6b4a2a'); // door
    px(ctx, 24, 25, 4, 8, '#8a6238');
    px(ctx, 28, 6, 4, 8, '#8a5a3c'); // chimney
    px(ctx, 28, 6, 4, 1, '#a8744e');
  });
}
function buildChimneySmoke(): Texture[] {
  return [0, 1, 2].map((f) =>
    makePixelTexture(10, 16, (ctx) => {
      const c = '#e2e5e8';
      const puffs: [number, number, number][] = [
        [4, 11 - f * 2, 3],
        [3, 7 - f * 2, 2],
        [5, 3 - f, 2],
      ];
      puffs.forEach(([x, y, r]) => {
        if (y < 0) return;
        px(ctx, x, y, r, r, c);
      });
    }),
  );
}
function buildPoolFrames(): Texture[] {
  return [0, 1].map((f) =>
    makePixelTexture(20, 9, (ctx) => {
      px(ctx, 1, 2, 18, 6, '#4fb8d8');
      px(ctx, 1, 2, 18, 1, '#8fdcef');
      px(ctx, 0, 1, 20, 1, '#cfeefb');
      for (let x = 2 + f * 3; x < 18; x += 6) px(ctx, x, 4, 2, 1, '#bff0fb');
    }),
  );
}
export function exportVilla(): Record<string, string> {
  const out: Record<string, string> = {};
  out.lawn = pngOf(buildLawn());
  out.house = pngOf(buildVillaHouse());
  buildChimneySmoke().forEach((t, k) => (out[`smoke_${k}`] = pngOf(t)));
  buildPoolFrames().forEach((t, k) => (out[`pool_${k}`] = pngOf(t)));
  buildFruitTreeFrames(0x6fae4f).forEach((t, k) => (out[`tree_${k}`] = pngOf(t)));
  const gardener = buildFarmerStates(0x4f8d5b);
  gardener.idle.forEach((t, k) => (out[`gardener_idle_${k}`] = pngOf(t)));
  gardener.harvest.forEach((t, k) => (out[`gardener_harvest_${k}`] = pngOf(t)));
  return out;
}

// ===================== 办公室 / 工厂 / 股票（投资）=====================
function buildPavement(): Texture {
  return makePixelTexture(44, 26, (ctx) => {
    px(ctx, 0, 0, 44, 26, '#9296a0'); // 整格人行道/广场
    px(ctx, 0, 0, 44, 2, '#a8acb4');
    for (let x = 0; x < 44; x += 8) px(ctx, x, 0, 1, 26, '#7d818b'); // 板缝
    for (let y = 0; y < 26; y += 8) px(ctx, 0, y, 44, 1, '#7d818b');
    px(ctx, 0, 25, 44, 1, '#6f737c');
  });
}
const TOWER_W = 34;
const TOWER_H = 32;
const WIN_ROWS = 5;
const WIN_COLS = 4;
function buildOfficeTower(body: string, parapet: string): Texture {
  const bx = 2;
  const bw = TOWER_W - 4; // 楼体更宽，填满格子
  return makePixelTexture(TOWER_W, TOWER_H, (ctx) => {
    px(ctx, bx, 2, bw, TOWER_H - 2, body);
    px(ctx, bx + 1, 2, 1, TOWER_H - 2, '#7689a8');
    px(ctx, bx + bw - 2, 2, 1, TOWER_H - 2, '#3f4c66');
    px(ctx, bx, 2, bw, 3, parapet); // roof parapet
    px(ctx, bx, TOWER_H - 3, bw, 3, '#37425c'); // base shade
    px(ctx, TOWER_W / 2 - 2, TOWER_H - 6, 4, 6, '#2a3550'); // door
    for (let r = 0; r < WIN_ROWS; r++)
      for (let c = 0; c < WIN_COLS; c++) px(ctx, 5 + c * 6, 7 + r * 4, 4, 3, '#33405c'); // dark windows
  });
}
function buildWindowFrames(): Texture[] {
  return [0, 1, 2].map((f) =>
    makePixelTexture(TOWER_W, TOWER_H, (ctx) => {
      for (let r = 0; r < WIN_ROWS; r++)
        for (let c = 0; c < WIN_COLS; c++) {
          if ((r + c + f) % 3 !== 0) continue;
          px(ctx, 5 + c * 6, 7 + r * 4, 4, 3, '#ffe27a');
          px(ctx, 5 + c * 6, 7 + r * 4, 4, 1, '#fff3c0');
        }
    }),
  );
}
function buildAntennaFrames(): Texture[] {
  return [true, false].map((on) =>
    makePixelTexture(6, 10, (ctx) => {
      px(ctx, 2, 2, 1, 8, '#9aa3b2');
      px(ctx, 1, 0, 3, 2, on ? '#ff5a4a' : '#7a2a26');
    }),
  );
}
function buildFactory(): Texture {
  return makePixelTexture(40, 30, (ctx) => {
    px(ctx, 4, 14, 30, 14, '#9a6b4f'); // brick hall
    px(ctx, 4, 14, 30, 1, '#b5825f');
    px(ctx, 4, 26, 30, 2, '#7c543d');
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 7; // sawtooth roof
      tri(ctx, x + 3, 14, 4, 5, '#7a8a96');
      px(ctx, x, 14, 7, 1, '#5f6e7a');
    }
    px(ctx, 16, 19, 9, 9, '#3f3a36'); // big door
    px(ctx, 17, 20, 7, 8, '#55504a');
    for (const x of [7, 28]) {
      px(ctx, x, 18, 4, 4, '#7fc6e0');
      px(ctx, x, 18, 4, 1, '#bfe6f2');
    }
    px(ctx, 6, 4, 4, 11, '#6b5547'); // chimneys
    px(ctx, 6, 4, 4, 1, '#86694f');
    px(ctx, 30, 6, 4, 9, '#6b5547');
    px(ctx, 30, 6, 4, 1, '#86694f');
  });
}
function buildFactorySmoke(): Texture[] {
  return [0, 1, 2].map((f) =>
    makePixelTexture(12, 18, (ctx) => {
      const c = '#cfd2d6';
      const puffs: [number, number, number][] = [
        [4, 13 - f * 2, 4],
        [3, 8 - f * 2, 3],
        [6, 4 - f, 3],
      ];
      puffs.forEach(([x, y, r]) => {
        if (y < 0) return;
        px(ctx, x, y, r, r, c);
      });
    }),
  );
}
function buildGearFrames(): Texture[] {
  const teeth: [number, number][] = [
    [5, 0],
    [9, 1],
    [10, 5],
    [9, 9],
    [5, 10],
    [1, 9],
    [0, 5],
    [1, 1],
  ];
  return [0, 1, 2, 3].map((f) =>
    makePixelTexture(12, 12, (ctx) => {
      px(ctx, 3, 3, 6, 6, '#b8bcc4'); // hub
      px(ctx, 3, 3, 6, 1, '#d3d7de');
      px(ctx, 5, 5, 2, 2, '#6b7079');
      for (let i = 0; i < 4; i++) {
        const [x, y] = teeth[(f + i * 2) % 8];
        px(ctx, x, y, 2, 2, '#cfd3da');
      }
    }),
  );
}

export function exportOffice(): Record<string, string> {
  const out: Record<string, string> = {};
  out.pavement = pngOf(buildPavement());
  out.tower = pngOf(buildOfficeTower('#4f6f8a', '#3a5168'));
  buildWindowFrames().forEach((t, k) => (out[`win_${k}`] = pngOf(t)));
  buildAntennaFrames().forEach((t, k) => (out[`ant_${k}`] = pngOf(t)));
  for (const [k, t] of Object.entries(arrowTextures())) out[k] = pngOf(t);
  return out;
}
export function exportFactory(): Record<string, string> {
  const out: Record<string, string> = {};
  out.pavement = pngOf(buildPavement());
  out.factory = pngOf(buildFactory());
  buildFactorySmoke().forEach((t, k) => (out[`smoke_${k}`] = pngOf(t)));
  buildGearFrames().forEach((t, k) => (out[`gear_${k}`] = pngOf(t)));
  for (const [k, t] of Object.entries(arrowTextures())) out[k] = pngOf(t);
  return out;
}
export function exportStock(company: StockCompany): Record<string, string> {
  const out: Record<string, string> = {};
  out.pavement = pngOf(buildPavement());
  out.tower = pngOf(buildOfficeTower('#566787', '#3f4d69'));
  buildWindowFrames().forEach((t, k) => (out[`win_${k}`] = pngOf(t)));
  out.logo = pngOf(companyLogo(company));
  for (const [k, t] of Object.entries(arrowTextures())) out[k] = pngOf(t);
  return out;
}
