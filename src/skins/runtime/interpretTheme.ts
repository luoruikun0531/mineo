import { AnimatedSprite, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { GridSpec, SceneHandle, ThemeSkin } from '../types';
import type { ThemeManifest } from '../format/manifest';

/**
 * 图片主题解释器：manifest（纯色 + UI）+ PNG 贴图 → ThemeSkin。
 *  - 土地/天空的"贴图"（土壤/篱笆/树/池塘/花/云/鸟）来自包内 PNG；
 *  - 大面积纯色（草地/泥径/天空渐变/太阳/远山）来自 manifest 的 hex 颜色；
 *  - 布局是引擎通用逻辑（与原程序化主题同布局）。引擎/board 零改动。
 *  - 纹理需先由加载器解码好再传入（ThemeSkin 无 load 钩子，buildLand 是同步的）。
 */
export function interpretThemeSkin(
  manifest: ThemeManifest,
  tex: Record<string, Texture>,
): ThemeSkin {
  return {
    id: manifest.id,
    name: manifest.name,
    tileSize: manifest.tileSize,
    canvasBackground: hex(manifest.canvasBackground),
    buildLand: (grid) => buildLand(grid, manifest, tex),
    buildBackdrop: (w, h) => buildBackdrop(w, h, manifest, tex),
    ui: manifest.ui,
  };
}

function hex(s: string): number {
  return parseInt(s.replace('#', ''), 16) || 0;
}

// ---- 土地（与 kit/buildPixelFarmLand 同布局，纹理换成包内 PNG）----

const MARGIN_X = 78;
const MARGIN_TOP = 74;
const MARGIN_BOTTOM = 98;
const SOIL_PX = 16;

function buildLand(grid: GridSpec, m: ThemeManifest, tex: Record<string, Texture>): SceneHandle {
  const { tileSize } = grid;
  const ds = tileSize / 56;
  const plotW = grid.cols * tileSize;
  const plotH = grid.rows * tileSize;
  const width = grid.cols * tileSize + MARGIN_X * 2;
  const height = grid.rows * tileSize + MARGIN_TOP + MARGIN_BOTTOM;
  const plotX = MARGIN_X;
  const plotY = MARGIN_TOP;
  const ground = hex(m.land.ground);
  const groundShade = hex(m.land.groundShade);
  const path = hex(m.land.path);

  const view = new Container();
  view.label = 'imageThemeLand';

  const base = new Graphics();
  base.ellipse(width / 2, height - 28, width * 0.46, 36).fill({ color: 0x000000, alpha: 0.06 });
  base.rect(20, 50, width - 40, height - 78).fill(ground);
  base.rect(20, height - 40, width - 40, 14).fill({ color: groundShade, alpha: 0.6 });
  base.rect(20, 50, width - 40, height - 78).stroke({ width: 2, color: groundShade });
  view.addChild(base);

  const pathG = new Graphics();
  pathG.rect(plotX - 14, plotY - 14, plotW + 28, plotH + 28).fill(path);
  view.addChild(pathG);

  const tileScale = tileSize / SOIL_PX;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const soil = (c + r) % 2 === 0 ? tex.soil_light : tex.soil_dark;
      const s = new Sprite(soil);
      s.scale.set(tileScale);
      s.position.set(plotX + c * tileSize, plotY + r * tileSize);
      view.addChild(s);
    }
  }

  for (const edgeY of [plotY - 20 * ds, plotY + plotH + 4 * ds]) {
    for (let x = plotX - 12; x <= plotX + plotW + 12; x += tileSize) {
      const post = new Sprite(tex.fence);
      post.anchor.set(0.5, 0);
      post.scale.set(ds);
      post.position.set(x, edgeY);
      view.addChild(post);
    }
  }

  const addAnim = (frames: Texture[], x: number, y: number, fps: number, s: number) => {
    const a = new AnimatedSprite(frames);
    a.anchor.set(0.5, 1);
    a.scale.set(s);
    a.animationSpeed = fps / 60;
    a.position.set(x, y);
    a.play();
    view.addChild(a);
  };
  addAnim([tex.tree_0, tex.tree_1], plotX - 30 * ds, plotY + 40 * ds, 1.2, 1.2 * ds);
  addAnim([tex.tree_0, tex.tree_1], plotX + plotW + 30 * ds, plotY + 26 * ds, 1.0, ds);
  addAnim([tex.pond_0, tex.pond_1], plotX - 6 * ds, plotY + plotH + 50 * ds, 2, 1.2 * ds);

  const addFlower = (t: Texture, x: number, y: number) => {
    const f = new Sprite(t);
    f.anchor.set(0.5, 1);
    f.scale.set(ds);
    f.position.set(x, y);
    view.addChild(f);
  };
  addFlower(tex.flower_0, plotX + plotW + 28 * ds, plotY + plotH + 38 * ds);
  addFlower(tex.flower_1, plotX + plotW + 44 * ds, plotY + plotH + 46 * ds);
  addFlower(tex.flower_0, plotX + 36 * ds, plotY + plotH + 62 * ds);

  const clouds = [
    { s: new Sprite(tex.cloud), base: width * 0.1, y: 22, speed: 9, sc: 1.4 * ds },
    { s: new Sprite(tex.cloud), base: width * 0.55, y: 12, speed: 6, sc: ds },
    { s: new Sprite(tex.cloud), base: width * 0.82, y: 34, speed: 11, sc: 1.2 * ds },
  ];
  for (const cl of clouds) {
    cl.s.scale.set(cl.sc);
    cl.s.y = cl.y;
    view.addChild(cl.s);
  }

  let elapsed = 0;
  const span = width + 140;
  return {
    view,
    size: { width, height },
    plot: { x: plotX, y: plotY, tileSize },
    update: (dt) => {
      elapsed += dt;
      for (const cl of clouds) cl.s.x = ((cl.base + elapsed * cl.speed) % span) - 70;
    },
    destroy: () => view.destroy({ children: true }),
  };
}

// ---- 天空背景（与 kit/buildPixelSkyBackdrop 同布局）----

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

function buildBackdrop(w: number, h: number, m: ThemeManifest, tex: Record<string, Texture>): SceneHandle {
  const view = new Container();
  const u = Math.max(2, Math.round(Math.min(w, h) / 200));
  const skyTop = hex(m.sky.skyTop);
  const skyBottom = hex(m.sky.skyBottom);
  const sunColor = hex(m.sky.sun);
  const hill = hex(m.sky.hill);
  const hillDark = hex(m.sky.hillDark);

  const sky = new Graphics();
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const c = lerpColor(skyTop, skyBottom, i / (bands - 1));
    sky.rect(0, Math.floor((h * i) / bands), w, Math.ceil(h / bands) + 1).fill(c);
  }
  view.addChild(sky);

  const sun = new Graphics();
  const sx = w * 0.82;
  const sy = h * 0.16;
  const sr = 16 * u;
  for (let i = 3; i >= 1; i--) {
    sun.circle(sx, sy, (sr * i) / 1.6).fill({ color: sunColor, alpha: 0.08 });
  }
  sun.rect(sx - sr * 0.6, sy - sr * 0.6, sr * 1.2, sr * 1.2).fill(sunColor);
  sun.rect(sx - sr * 0.75, sy - sr * 0.45, sr * 1.5, sr * 0.9).fill({ color: sunColor, alpha: 0.9 });
  sun.rect(sx - sr * 0.45, sy - sr * 0.75, sr * 0.9, sr * 1.5).fill({ color: sunColor, alpha: 0.9 });
  view.addChild(sun);

  const hills = new Graphics();
  hills.ellipse(w * 0.25, h + h * 0.1, w * 0.4, h * 0.22).fill(hillDark);
  hills.ellipse(w * 0.7, h + h * 0.12, w * 0.45, h * 0.2).fill(hill);
  view.addChild(hills);

  const clouds = [
    { base: w * 0.08, y: h * 0.1, speed: 10, sc: 4 * u },
    { base: w * 0.4, y: h * 0.06, speed: 7, sc: 3 * u },
    { base: w * 0.66, y: h * 0.14, speed: 13, sc: 5 * u },
    { base: w * 0.2, y: h * 0.24, speed: 9, sc: 3.4 * u },
    { base: w * 0.85, y: h * 0.28, speed: 6, sc: 2.6 * u },
  ].map((c) => {
    const s = new Sprite(tex.sky_cloud);
    s.anchor.set(0.5);
    s.scale.set(c.sc / 6);
    s.alpha = 0.95;
    s.y = c.y;
    view.addChild(s);
    return { s, ...c };
  });

  const birds = [
    { base: w * 0.3, y: h * 0.2, speed: 26, sc: 3 * u },
    { base: w * 0.55, y: h * 0.15, speed: 30, sc: 2.4 * u },
  ].map((b) => {
    const s = new Sprite(tex.bird);
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
