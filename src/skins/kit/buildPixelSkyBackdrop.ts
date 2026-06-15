import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { SceneHandle } from '../types';
import { makePixelTexture } from './pixel';

/** 天空背景配色（土地皮肤提供） */
export interface SkyPalette {
  skyTop: number;
  skyBottom: number;
  cloud: number;
  sun: number;
  hill: number;
  hillDark: number;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** 天空背景需要的像素贴图（云 + 鸟）。构建期可单独导出成 PNG。 */
export function pixelSkyTextures(p: SkyPalette): { cloud: Texture; bird: Texture } {
  const cloud = makePixelTexture(28, 11, (ctx) => {
    ctx.fillStyle = '#' + p.cloud.toString(16).padStart(6, '0');
    ctx.fillRect(2, 5, 24, 5);
    ctx.fillRect(6, 2, 16, 5);
    ctx.fillRect(11, 1, 8, 2);
  });
  const bird = makePixelTexture(7, 4, (ctx) => {
    ctx.fillStyle = 'rgba(80,60,45,0.55)';
    ctx.fillRect(0, 1, 2, 1);
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(3, 1, 1, 1);
    ctx.fillRect(4, 2, 1, 1);
    ctx.fillRect(5, 1, 2, 1);
  });
  return { cloud, bird };
}

/**
 * 平台 SDK · 全屏「像素天空」背景。铺满视野，土地在其之上居中。
 * 分段天空渐变 + 像素太阳 + 漂移云朵 + 远山 + 小鸟。屏幕空间，随窗口尺寸重建。
 */
export function buildPixelSkyBackdrop(
  w: number,
  h: number,
  p: SkyPalette,
): SceneHandle {
  const view = new Container();
  const u = Math.max(2, Math.round(Math.min(w, h) / 200)); // 像素颗粒

  // 分段天空渐变（像素带）
  const sky = new Graphics();
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const c = lerpColor(p.skyTop, p.skyBottom, i / (bands - 1));
    sky.rect(0, Math.floor((h * i) / bands), w, Math.ceil(h / bands) + 1).fill(c);
  }
  view.addChild(sky);

  // 像素太阳（右上）+ 柔光
  const sun = new Graphics();
  const sx = w * 0.82;
  const sy = h * 0.16;
  const sr = 16 * u;
  for (let i = 3; i >= 1; i--) {
    sun.circle(sx, sy, (sr * i) / 1.6).fill({ color: p.sun, alpha: 0.08 });
  }
  // 方块感太阳本体
  sun.rect(sx - sr * 0.6, sy - sr * 0.6, sr * 1.2, sr * 1.2).fill(p.sun);
  sun.rect(sx - sr * 0.75, sy - sr * 0.45, sr * 1.5, sr * 0.9).fill({ color: p.sun, alpha: 0.9 });
  sun.rect(sx - sr * 0.45, sy - sr * 0.75, sr * 0.9, sr * 1.5).fill({ color: p.sun, alpha: 0.9 });
  view.addChild(sun);

  // 远山（底部，flat 块）
  const hills = new Graphics();
  hills.ellipse(w * 0.25, h + h * 0.1, w * 0.4, h * 0.22).fill(p.hillDark);
  hills.ellipse(w * 0.7, h + h * 0.12, w * 0.45, h * 0.2).fill(p.hill);
  view.addChild(hills);

  // 云 + 鸟贴图（像素）—— 与导出 PNG 共用同一生成器
  const { cloud: cloudTex, bird: birdTex } = pixelSkyTextures(p);
  const clouds = [
    { base: w * 0.08, y: h * 0.1, speed: 10, sc: 4 * u },
    { base: w * 0.4, y: h * 0.06, speed: 7, sc: 3 * u },
    { base: w * 0.66, y: h * 0.14, speed: 13, sc: 5 * u },
    { base: w * 0.2, y: h * 0.24, speed: 9, sc: 3.4 * u },
    { base: w * 0.85, y: h * 0.28, speed: 6, sc: 2.6 * u },
  ].map((c) => {
    const s = new Sprite(cloudTex);
    s.anchor.set(0.5);
    s.scale.set(c.sc / 6);
    s.alpha = 0.95;
    s.y = c.y;
    view.addChild(s);
    return { s, ...c };
  });

  // 小鸟（两只 v 形飘过）
  const birds = [
    { base: w * 0.3, y: h * 0.2, speed: 26, sc: 3 * u },
    { base: w * 0.55, y: h * 0.15, speed: 30, sc: 2.4 * u },
  ].map((b) => {
    const s = new Sprite(birdTex);
    s.anchor.set(0.5);
    s.scale.set(b.sc / 6);
    s.y = b.y;
    view.addChild(s);
    return { s, ...b };
  });

  let elapsed = 0;
  const span = w + 240;
  return {
    view,
    size: { width: w, height: h },
    update: (dt) => {
      elapsed += dt;
      for (const c of clouds) c.s.x = ((c.base + elapsed * c.speed) % span) - 120;
      for (const b of birds) {
        b.s.x = ((b.base + elapsed * b.speed) % span) - 120;
        b.s.y = b.y + Math.sin(elapsed * 2 + b.base) * 4;
      }
    },
    destroy: () => view.destroy({ children: true }),
  };
}
