import { Container, Graphics } from 'pixi.js';

/**
 * 平台 SDK · 土地装饰积木（云 / 树 / 花 / 池塘 / 阳光）。
 * 供土地皮肤复用；每个返回 view（+ 可选 update(t)）。
 */
export interface Decoration {
  view: Container;
  update?: (t: number) => void;
}

/** 土地皮肤色板（土地皮肤各自提供具体值） */
export interface LandPalette {
  grass: number;
  grassDark: number;
  ground: number;
  groundShade: number;
  path: number;
  plotLight: number;
  plotDark: number;
  furrow: number;
  fence: number;
  fenceShade: number;
  trunk: number;
  leaf: number;
  leafDark: number;
  flowerA: number;
  flowerB: number;
  flowerCore: number;
  water: number;
  waterLight: number;
  cloud: number;
  sunGlow: number;
}

export function makeCloud(p: LandPalette, scale = 1): Container {
  const c = new Container();
  const g = new Graphics();
  const w = 46 * scale;
  const h = 18 * scale;
  g.roundRect(0, h * 0.3, w, h, h).fill({ color: p.cloud, alpha: 0.92 });
  g.roundRect(w * 0.18, 0, w * 0.5, h, h).fill({ color: p.cloud, alpha: 0.92 });
  g.roundRect(w * 0.5, h * 0.15, w * 0.42, h * 0.9, h).fill({ color: p.cloud, alpha: 0.92 });
  c.addChild(g);
  c.alpha = 0.85;
  return c;
}

export function makeTree(p: LandPalette, phase = 0, scale = 1): Decoration {
  const view = new Container();
  const trunk = new Graphics();
  trunk.roundRect(-5 * scale, -22 * scale, 10 * scale, 26 * scale, 3).fill(p.trunk);
  view.addChild(trunk);

  const canopy = new Container();
  const leaves = new Graphics();
  const s = scale;
  leaves.circle(0, -34 * s, 20 * s).fill(p.leafDark);
  leaves.circle(-14 * s, -28 * s, 14 * s).fill(p.leaf);
  leaves.circle(13 * s, -30 * s, 15 * s).fill(p.leaf);
  leaves.circle(0, -44 * s, 15 * s).fill(p.leaf);
  leaves.circle(-4 * s, -40 * s, 6 * s).fill({ color: 0xffffff, alpha: 0.18 });
  canopy.addChild(leaves);
  canopy.pivot.set(0, -22 * s);
  canopy.position.set(0, -22 * s);
  view.addChild(canopy);

  return {
    view,
    update: (t) => {
      canopy.rotation = Math.sin(t * 1.1 + phase) * 0.05;
    },
  };
}

export function makeFlower(p: LandPalette, color: number, phase = 0, scale = 1): Decoration {
  const view = new Container();
  const s = scale;
  const stem = new Graphics();
  stem.roundRect(-1.5 * s, 0, 3 * s, 12 * s, 2).fill(p.leafDark);
  view.addChild(stem);

  const bloom = new Container();
  const petals = new Graphics();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    petals.circle(Math.cos(a) * 4 * s, Math.sin(a) * 4 * s, 3 * s).fill(color);
  }
  petals.circle(0, 0, 2.6 * s).fill(p.flowerCore);
  bloom.addChild(petals);
  view.addChild(bloom);

  return {
    view,
    update: (t) => {
      bloom.y = Math.sin(t * 2 + phase) * 1.6 * s;
    },
  };
}

export function makePond(p: LandPalette, w = 86, h = 50): Decoration {
  const view = new Container();
  const water = new Graphics();
  water.ellipse(0, 0, w / 2, h / 2).fill(p.water);
  water.ellipse(-w * 0.12, -h * 0.12, w * 0.28, h * 0.22).fill({ color: p.waterLight, alpha: 0.6 });
  view.addChild(water);

  const ripples: Graphics[] = [];
  for (let i = 0; i < 2; i++) {
    const r = new Graphics();
    r.ellipse(0, 0, w * 0.22, h * 0.22).stroke({ width: 2, color: p.waterLight });
    view.addChild(r);
    ripples.push(r);
  }

  return {
    view,
    update: (t) => {
      ripples.forEach((r, i) => {
        const phase = (t * 0.5 + i * 0.5) % 1;
        const k = 0.6 + phase * 1.1;
        r.scale.set(k, k);
        r.alpha = 0.7 * (1 - phase);
      });
    },
  };
}

export function makeSunGlow(p: LandPalette, radius = 70): Decoration {
  const view = new Container();
  const g = new Graphics();
  for (let i = 4; i >= 1; i--) {
    g.circle(0, 0, (radius * i) / 4).fill({ color: p.sunGlow, alpha: 0.1 });
  }
  g.circle(0, 0, radius * 0.32).fill({ color: p.sunGlow, alpha: 0.55 });
  view.addChild(g);
  return {
    view,
    update: (t) => {
      view.alpha = 0.8 + Math.sin(t * 0.8) * 0.15;
    },
  };
}
