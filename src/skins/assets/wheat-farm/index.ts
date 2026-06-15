import { AnimatedSprite, Container, Sprite, type Texture } from 'pixi.js';
import type { AssetSkin, AssetSkinHandle } from '../../types';
import {
  buildFarmerStates,
  buildGroundTexture,
  buildLazyFrames,
  buildSackTexture,
  buildWheatFrames,
  harvestPop,
  killMotion,
  makeProgressBar,
} from '../../kit';

/**
 * 资产皮肤：像素麦田场（默认像素风）。
 * 一块耕地 + 一排麦子 + 锄地农民 + 偷懒农民 + 粮袋，全部像素帧 + 最近邻。
 * 4 事件编排：working1/2/3 逐级加快节奏；working3（冲刺）时连偷懒的也起来干活；
 * harvest 锄地农民欢呼 + 麦子弹跳。与资产类型无关。
 */
const ART_GRID = 46;
const HOE_SHIRT = 0xc8553d;
const LAZY_SHIRT = 0xcf9b3e;

interface Art {
  ground: Texture;
  sack: Texture;
  wheat: Texture[];
  hoe: { idle: Texture[]; harvest: Texture[] };
  lazySit: Texture[];
  lazyWork: { idle: Texture[]; harvest: Texture[] };
}
let art: Art | null = null;

function buildArt(): Art {
  return {
    ground: buildGroundTexture(),
    sack: buildSackTexture(),
    wheat: buildWheatFrames(),
    hoe: buildFarmerStates(HOE_SHIRT),
    lazySit: buildLazyFrames(LAZY_SHIRT),
    lazyWork: buildFarmerStates(LAZY_SHIRT),
  };
}

const wheatFarm: AssetSkin = {
  id: 'wheat-farm',
  name: { en: 'Wheat Farm', zh: '麦田场' },
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

    const ground = new Sprite(a.ground);
    ground.anchor.set(0.5);
    at(ground, 0, -1);

    const wheats: AnimatedSprite[] = [];
    [-13, -6, 1, 8].forEach((lx, i) => {
      const w = anim(a.wheat, 2 + i * 0.4);
      at(w, lx, 0);
      wheats.push(w);
    });

    const hoe = anim(a.hoe.idle, 4);
    at(hoe, -10, 12);
    const lazy = anim(a.lazySit, 1.5);
    at(lazy, 12, 13);

    const sack = new Sprite(a.sack);
    sack.anchor.set(0.5, 1);
    at(sack, 18, 11);

    // 头顶进度条（成熟度）—— 皮肤的一部分
    const bar = makeProgressBar(tileSize * 0.6);
    bar.view.position.set(0, -tileSize * 0.42);
    view.addChild(bar.view);

    let level = 1;
    let phaseSec = 1;
    let cheering = false;
    let lazyWorking = false;

    // 动态：阶段越短动画越快，把该阶段动画铺满其时长（无固定时长）
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
      hoe.animationSpeed = spd([0, 4, 7, 11][level]);
      const wantWork = level >= 3; // 冲刺：偷懒的也起来干
      if (wantWork !== lazyWorking) {
        lazyWorking = wantWork;
        swap(lazy, wantWork ? a.lazyWork.idle : a.lazySit, spd(wantWork ? 9 : 2), true);
      } else {
        lazy.animationSpeed = spd(wantWork ? 9 : 2);
      }
      wheats.forEach((w, i) => (w.animationSpeed = spd(2 + level + i * 0.4)));
    };
    applyLevel();

    return {
      view,
      setProgress: (p) => bar.set(p),
      onEvent: (event, ph) => {
        if (event === 'harvest') {
          for (const w of wheats) harvestPop(w);
          if (!cheering) {
            cheering = true;
            swap(hoe, a.hoe.harvest, 8 / 60, false);
            hoe.onComplete = () => {
              hoe.onComplete = undefined;
              cheering = false;
              swap(hoe, a.hoe.idle, spd([0, 4, 7, 11][level]), true);
            };
          }
          return;
        }
        if (typeof ph === 'number' && ph > 0) phaseSec = ph;
        level = event === 'working1' ? 1 : event === 'working2' ? 2 : 3;
        if (!cheering) applyLevel();
      },
      destroy: () => {
        for (const w of wheats) killMotion(w);
        killMotion(view);
        view.destroy({ children: true });
      },
    };
  },
};

export default wheatFarm;
