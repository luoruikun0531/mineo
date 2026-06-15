import { AnimatedSprite, Container, Sprite, type Texture } from 'pixi.js';
import type { AssetSkin, AssetSkinHandle } from '../../types';
import {
  buildFarmerStates,
  buildLazyFrames,
  harvestPop,
  killMotion,
  makeProgressBar,
} from '../../kit';
import {
  buildCrateTexture,
  buildFruitTreeFrames,
  buildGrassTexture,
} from './sprites';

/**
 * 资产皮肤：像素果园（默认像素风）。
 * 草地 + 三棵果树 + 两个采摘工 + 一个偷懒的 + 果筐。全像素帧 + 最近邻。
 * 4 事件：working1/2/3 逐级加快；working3 偷懒的也起来采；harvest 果树弹跳 + 采摘工欢呼。
 */
const ART_GRID = 46;
const FRUIT = [0xe2502f, 0xf0902f, 0xe2502f];
const PICKER_SHIRTS = [0x4f8d5b, 0xc8553d];
const LAZY_SHIRT = 0xcf9b3e;

interface Art {
  grass: Texture;
  crate: Texture;
  trees: Texture[][];
  pickers: { idle: Texture[]; harvest: Texture[] }[];
  lazySit: Texture[];
  lazyWork: { idle: Texture[]; harvest: Texture[] };
}
let art: Art | null = null;

function buildArt(): Art {
  return {
    grass: buildGrassTexture(),
    crate: buildCrateTexture(0xe2502f),
    trees: FRUIT.map((f) => buildFruitTreeFrames(f)),
    pickers: PICKER_SHIRTS.map((s) => buildFarmerStates(s)),
    lazySit: buildLazyFrames(LAZY_SHIRT),
    lazyWork: buildFarmerStates(LAZY_SHIRT),
  };
}

const orchard: AssetSkin = {
  id: 'orchard',
  name: { en: 'Orchard', zh: '果园' },
  load: async () => {
    if (!art) art = buildArt();
  },
  build: ({ tileSize }): AssetSkinHandle => {
    const a = art ?? (art = buildArt());
    const unit = tileSize / ART_GRID;
    const view = new Container();

    const at = (obj: Container, lx: number, ly: number) => {
      obj.scale.set(unit);
      obj.position.set(lx * unit, ly * unit);
      view.addChild(obj);
    };
    const anim = (frames: Texture[], fps: number): AnimatedSprite => {
      const s = new AnimatedSprite(frames);
      s.anchor.set(0.5, 1);
      s.animationSpeed = fps / 60;
      s.play();
      return s;
    };

    const grass = new Sprite(a.grass);
    grass.anchor.set(0.5);
    at(grass, 0, -1);

    const trees: AnimatedSprite[] = [];
    [
      [-13, 5],
      [-1, 3],
      [12, 5],
    ].forEach(([lx, ly], i) => {
      const t = anim(a.trees[i], 1.2 + i * 0.3);
      at(t, lx, ly);
      trees.push(t);
    });

    const pickers = [
      anim(a.pickers[0].idle, 4),
      anim(a.pickers[1].idle, 4),
    ];
    at(pickers[0], -9, 13);
    at(pickers[1], 4, 14);
    const lazy = anim(a.lazySit, 1.5);
    at(lazy, 15, 13);

    const crateA = new Sprite(a.crate);
    crateA.anchor.set(0.5, 1);
    at(crateA, 17, 12);
    const crateB = new Sprite(a.crate);
    crateB.anchor.set(0.5, 1);
    at(crateB, 17, 6);

    // 头顶进度条（成熟度）—— 皮肤的一部分
    const bar = makeProgressBar(tileSize * 0.6);
    bar.view.position.set(0, -tileSize * 0.44);
    view.addChild(bar.view);

    let level = 1;
    let phaseSec = 1;
    let cheering = false;
    let lazyWorking = false;
    const spd = (baseFps: number) => {
      const f = phaseSec > 0 ? Math.min(3, Math.max(0.4, 0.5 / phaseSec)) : 1;
      return (baseFps * f) / 60;
    };
    const swap = (s: AnimatedSprite, frames: Texture[], speed: number, loop: boolean) => {
      s.textures = frames;
      s.animationSpeed = speed;
      s.loop = loop;
      s.gotoAndPlay(0);
    };
    const applyLevel = () => {
      pickers.forEach((p, i) => (p.animationSpeed = spd([0, 4, 7, 11][level] + i)));
      const wantWork = level >= 3;
      if (wantWork !== lazyWorking) {
        lazyWorking = wantWork;
        swap(lazy, wantWork ? a.lazyWork.idle : a.lazySit, spd(wantWork ? 9 : 2), true);
      } else {
        lazy.animationSpeed = spd(wantWork ? 9 : 2);
      }
    };
    applyLevel();

    return {
      view,
      setProgress: (p) => bar.set(p),
      onEvent: (event, ph) => {
        if (event === 'harvest') {
          for (const t of trees) harvestPop(t);
          if (!cheering) {
            cheering = true;
            pickers.forEach((p, i) => swap(p, a.pickers[i].harvest, 8 / 60, false));
            pickers[0].onComplete = () => {
              pickers[0].onComplete = undefined;
              cheering = false;
              pickers.forEach((p, i) => swap(p, a.pickers[i].idle, spd([0, 4, 7, 11][level] + i), true));
            };
          }
          return;
        }
        if (typeof ph === 'number' && ph > 0) phaseSec = ph;
        level = event === 'working1' ? 1 : event === 'working2' ? 2 : 3;
        if (!cheering) applyLevel();
      },
      destroy: () => {
        for (const t of trees) killMotion(t);
        killMotion(view);
        view.destroy({ children: true });
      },
    };
  },
};

export default orchard;
