import { Container, Graphics } from 'pixi.js';
import type { GridSpec, SceneHandle } from '../types';
import {
  makeCloud,
  makeFlower,
  makePond,
  makeSunGlow,
  makeTree,
  type Decoration,
  type LandPalette,
} from './landParts';

const MARGIN_X = 78;
const MARGIN_TOP = 74;
const MARGIN_BOTTOM = 98;

export function farmLandSceneSize(grid: GridSpec): {
  width: number;
  height: number;
} {
  return {
    width: grid.cols * grid.tileSize + MARGIN_X * 2,
    height: grid.rows * grid.tileSize + MARGIN_TOP + MARGIN_BOTTOM,
  };
}

/**
 * 平台 SDK · 通用"暖色田园方格土地"构建器。
 * 土地皮肤只需提供一套 LandPalette 即可得到一块动画化土地（圆角地基 + 耕地 +
 * 篱笆 + 树/花/池塘/云/阳光）。适配动态格子数（cols=rows=n）。
 * 若想要完全不同形态的土地（如太空站），皮肤可不使用本构建器，自行实现 buildLand。
 */
export function buildFarmLand(grid: GridSpec, p: LandPalette): SceneHandle {
  const { tileSize } = grid;
  const ds = tileSize / 56;
  const plotW = grid.cols * tileSize;
  const plotH = grid.rows * tileSize;
  const { width, height } = farmLandSceneSize(grid);
  const plotX = MARGIN_X;
  const plotY = MARGIN_TOP;

  const view = new Container();
  view.label = 'farmLand';

  const base = new Graphics();
  base.ellipse(width / 2, height - 30, width * 0.46, 40).fill({ color: 0x000000, alpha: 0.06 });
  base.roundRect(22, 52, width - 44, height - 80, 40).fill(p.ground);
  base.roundRect(22, height - 84, width - 44, 56, 40).fill({ color: p.groundShade, alpha: 0.5 });
  view.addChild(base);

  const path = new Graphics();
  const padPath = 18 * ds;
  path
    .roundRect(plotX - padPath, plotY - padPath, plotW + padPath * 2, plotH + padPath * 2, 22)
    .fill(p.path);
  path
    .roundRect(plotX - padPath, plotY - padPath, plotW + padPath * 2, plotH + padPath * 2, 22)
    .stroke({ width: 3, color: p.furrow, alpha: 0.25 });
  view.addChild(path);

  const tiles = new Graphics();
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const x = plotX + c * tileSize;
      const y = plotY + r * tileSize;
      const color = (c + r) % 2 === 0 ? p.plotLight : p.plotDark;
      tiles.rect(x, y, tileSize, tileSize).fill(color);
    }
  }
  tiles.roundRect(plotX, plotY, plotW, plotH, 8).stroke({ width: 2, color: p.furrow, alpha: 0.3 });
  view.addChild(tiles);

  const fence = new Graphics();
  for (const edgeY of [plotY - 22 * ds, plotY + plotH + 6 * ds]) {
    fence.roundRect(plotX - 16, edgeY + 5 * ds, plotW + 32, 4 * ds, 2).fill({ color: p.fence, alpha: 0.85 });
    for (let x = plotX - 16; x <= plotX + plotW + 16; x += tileSize) {
      fence.roundRect(x - 3 * ds, edgeY, 6 * ds, 15 * ds, 2).fill(p.fence);
      fence.roundRect(x - 3 * ds, edgeY + 10 * ds, 6 * ds, 5 * ds, 2).fill(p.fenceShade);
    }
  }
  view.addChild(fence);

  const decos: Decoration[] = [];
  const add = (d: Decoration, x: number, y: number) => {
    d.view.position.set(x, y);
    view.addChild(d.view);
    decos.push(d);
  };

  add(makeTree(p, 0.0, 1.05 * ds), plotX - 44 * ds, plotY + 26 * ds);
  add(makeTree(p, 1.7, 0.85 * ds), plotX + plotW + 40 * ds, plotY + 4 * ds);
  add(makePond(p, 78 * ds, 46 * ds), plotX - 18 * ds, plotY + plotH + 44 * ds);

  const flowerSpots: Array<[number, number, number]> = [
    [plotX + plotW + 26 * ds, plotY + plotH + 34 * ds, 0],
    [plotX + plotW + 46 * ds, plotY + plotH + 42 * ds, 1.1],
    [plotX + 34 * ds, plotY + plotH + 60 * ds, 2.0],
    [plotX - 52 * ds, plotY + plotH + 2 * ds, 0.6],
  ];
  flowerSpots.forEach(([x, y, ph], i) => {
    add(makeFlower(p, i % 2 === 0 ? p.flowerA : p.flowerB, ph, 1.1 * ds), x, y);
  });

  const clouds = [
    { view: makeCloud(p, 1.2 * ds), base: width * 0.1, y: 26, speed: 9 },
    { view: makeCloud(p, 0.9 * ds), base: width * 0.55, y: 14, speed: 6 },
    { view: makeCloud(p, 1.0 * ds), base: width * 0.82, y: 40, speed: 11 },
  ];
  clouds.forEach((cl) => {
    cl.view.y = cl.y;
    view.addChild(cl.view);
  });

  const sun = makeSunGlow(p, 70 * ds);
  sun.view.position.set(width - 56, 52);
  view.addChildAt(sun.view, 1);
  decos.push(sun);

  let elapsed = 0;
  const cloudSpan = width + 120;
  return {
    view,
    size: { width, height },
    plot: { x: plotX, y: plotY, tileSize },
    update: (dt) => {
      elapsed += dt;
      for (const d of decos) d.update?.(elapsed);
      for (const cl of clouds) {
        cl.view.x = ((cl.base + elapsed * cl.speed) % cloudSpan) - 60;
      }
    },
    destroy: () => view.destroy({ children: true }),
  };
}
