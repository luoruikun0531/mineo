import {
  AnimatedSprite,
  Container,
  Graphics,
  Sprite,
  type Texture,
} from 'pixi.js';
import type { GridSpec, SceneHandle } from '../types';
import { cssHex, makePixelTexture } from './pixel';
import type { LandPalette } from './landParts';

/**
 * 平台 SDK · 通用「像素」田园方格土地构建器。
 * 与 buildFarmLand 同布局，但全部用像素贴图（最近邻）绘制 → 像素风。
 * 土地皮肤只需提供 LandPalette。适配动态格子数（cols=rows=n）。
 */

const MARGIN_X = 78;
const MARGIN_TOP = 74;
const MARGIN_BOTTOM = 98;
const SOIL_PX = 16; // 土壤贴图逻辑尺寸

export function pixelFarmLandSceneSize(grid: GridSpec): {
  width: number;
  height: number;
} {
  return {
    width: grid.cols * grid.tileSize + MARGIN_X * 2,
    height: grid.rows * grid.tileSize + MARGIN_TOP + MARGIN_BOTTOM,
  };
}

interface LandTextures {
  soilLight: Texture;
  soilDark: Texture;
  fence: Texture;
  tree: Texture[];
  pond: Texture[];
  flower: Texture[];
  cloud: Texture;
}
const cache = new Map<LandPalette, LandTextures>();

function landTextures(p: LandPalette): LandTextures {
  const hit = cache.get(p);
  if (hit) return hit;

  const fill = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) => {
    ctx.fillStyle = cssHex(c);
    ctx.fillRect(x, y, w, h);
  };
  const soil = (base: number, fleck: number) =>
    makePixelTexture(SOIL_PX, SOIL_PX, (ctx) => {
      fill(ctx, 0, 0, SOIL_PX, SOIL_PX, base);
      fill(ctx, 0, 7, SOIL_PX, 1, p.furrow);
      fill(ctx, 3, 3, 1, 1, fleck);
      fill(ctx, 11, 12, 1, 1, fleck);
    });

  const tex: LandTextures = {
    soilLight: soil(p.plotLight, p.furrow),
    soilDark: soil(p.plotDark, p.furrow),
    fence: makePixelTexture(6, 16, (ctx) => {
      fill(ctx, 1, 0, 4, 16, p.fence);
      fill(ctx, 1, 10, 4, 3, p.fenceShade);
    }),
    tree: [0, 1].map((lean) =>
      makePixelTexture(24, 30, (ctx) => {
        fill(ctx, 10, 20, 4, 10, p.trunk);
        const o = lean;
        fill(ctx, 3 + o, 6, 18, 12, p.leafDark);
        fill(ctx, 5 + o, 3, 13, 7, p.leaf);
        fill(ctx, 6 + o, 5, 4, 2, p.leaf);
        fill(ctx, 7 + o, 5, 2, 1, 0xffffff);
      }),
    ),
    pond: [0, 1].map((f) =>
      makePixelTexture(30, 16, (ctx) => {
        fill(ctx, 2, 4, 26, 9, p.water);
        fill(ctx, 0, 6, 30, 4, p.water);
        fill(ctx, 6 + f * 3, 6, 8, 2, p.waterLight);
        fill(ctx, 18, 9, 5, 1, p.waterLight);
      }),
    ),
    flower: [p.flowerA, p.flowerB].map((col) =>
      makePixelTexture(7, 11, (ctx) => {
        fill(ctx, 3, 5, 1, 6, p.leafDark);
        fill(ctx, 2, 2, 3, 3, col);
        fill(ctx, 1, 3, 5, 1, col);
        fill(ctx, 3, 3, 1, 1, p.flowerCore);
      }),
    ),
    cloud: makePixelTexture(24, 10, (ctx) => {
      fill(ctx, 2, 4, 20, 4, p.cloud);
      fill(ctx, 5, 2, 14, 4, p.cloud);
      fill(ctx, 9, 1, 7, 2, p.cloud);
    }),
  };
  cache.set(p, tex);
  return tex;
}

export function buildPixelFarmLand(grid: GridSpec, p: LandPalette): SceneHandle {
  const { tileSize } = grid;
  const ds = tileSize / 56;
  const plotW = grid.cols * tileSize;
  const plotH = grid.rows * tileSize;
  const { width, height } = pixelFarmLandSceneSize(grid);
  const plotX = MARGIN_X;
  const plotY = MARGIN_TOP;
  const tex = landTextures(p);

  const view = new Container();
  view.label = 'pixelFarmLand';

  // 草地地基（平铺纯色块，方角，像素友好）+ 落影 + 深色边
  const base = new Graphics();
  base.ellipse(width / 2, height - 28, width * 0.46, 36).fill({ color: 0x000000, alpha: 0.06 });
  base.rect(20, 50, width - 40, height - 78).fill(p.ground);
  base.rect(20, height - 40, width - 40, 14).fill({ color: p.groundShade, alpha: 0.6 });
  base.rect(20, 50, width - 40, height - 78).stroke({ width: 2, color: p.groundShade });
  view.addChild(base);

  // 泥土小径（plot 外圈一圈深色）
  const path = new Graphics();
  path.rect(plotX - 14, plotY - 14, plotW + 28, plotH + 28).fill(p.path);
  view.addChild(path);

  // 耕地方格（像素土壤贴图，棋盘）
  const tileScale = tileSize / SOIL_PX;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const s = new Sprite((c + r) % 2 === 0 ? tex.soilLight : tex.soilDark);
      s.scale.set(tileScale);
      s.position.set(plotX + c * tileSize, plotY + r * tileSize);
      view.addChild(s);
    }
  }

  // 篱笆（上下两排立柱）
  for (const edgeY of [plotY - 20 * ds, plotY + plotH + 4 * ds]) {
    for (let x = plotX - 12; x <= plotX + plotW + 12; x += tileSize) {
      const post = new Sprite(tex.fence);
      post.anchor.set(0.5, 0);
      post.scale.set(ds);
      post.position.set(x, edgeY);
      view.addChild(post);
    }
  }

  // 动态装饰
  const animated: AnimatedSprite[] = [];
  const addAnim = (frames: Texture[], x: number, y: number, fps: number, s: number) => {
    const a = new AnimatedSprite(frames);
    a.anchor.set(0.5, 1);
    a.scale.set(s);
    a.animationSpeed = fps / 60;
    a.position.set(x, y);
    a.play();
    view.addChild(a);
    animated.push(a);
  };
  addAnim(tex.tree, plotX - 30 * ds, plotY + 40 * ds, 1.2, 1.2 * ds);
  addAnim(tex.tree, plotX + plotW + 30 * ds, plotY + 26 * ds, 1.0, ds);
  addAnim(tex.pond, plotX - 6 * ds, plotY + plotH + 50 * ds, 2, 1.2 * ds);

  const addFlower = (frame: number, x: number, y: number) => {
    const f = new Sprite(tex.flower[frame]);
    f.anchor.set(0.5, 1);
    f.scale.set(ds);
    f.position.set(x, y);
    view.addChild(f);
  };
  addFlower(0, plotX + plotW + 28 * ds, plotY + plotH + 38 * ds);
  addFlower(1, plotX + plotW + 44 * ds, plotY + plotH + 46 * ds);
  addFlower(0, plotX + 36 * ds, plotY + plotH + 62 * ds);

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
