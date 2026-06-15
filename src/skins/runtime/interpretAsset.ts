import { AnimatedSprite, Container, Sprite, Texture } from 'pixi.js';
import type { AssetEvent, AssetSkin, AssetSkinHandle, PriceState } from '../types';
import { bob, breathe, harvestPop, killMotion, sway } from '../kit/motion';
import { makeProgressBar } from '../kit/progressBar';
import { assetFrameNames, type AssetManifest, type LayerManifest } from '../format/manifest';
import { loadTexture } from './texture';

/**
 * 图片皮肤解释器：把一个皮肤包（manifest + 图片源）解释成引擎认识的 AssetSkin。
 *  - 美术全部来自 PNG（AI 可生成）；布局/行为来自 manifest 的声明。
 *  - 动效由解释器程序化施加（环境动作 + 分档提速 + 丰收弹跳），AI 不必做逐帧动画。
 *  - 产出标准 AssetSkin（load 预解码纹理、build 同步组装），引擎与 board 零改动。
 *
 * @param images 帧名 → 图片 URL（bundled 为静态路径；本地库为 blob: URL）。
 */
export function interpretAssetSkin(
  manifest: AssetManifest,
  images: Record<string, string>,
): AssetSkin {
  const textures: Record<string, Texture> = {};

  return {
    id: manifest.id,
    name: manifest.name,
    load: async () => {
      await Promise.all(
        assetFrameNames(manifest).map(async (name) => {
          if (textures[name] || !images[name]) return;
          textures[name] = await loadTexture(images[name], manifest.pixelated);
        }),
      );
    },
    build: ({ tileSize }) => buildComposite(manifest, textures, tileSize),
  };
}

const WORKER_HARVEST = 'harvest';
const WORKER_IDLE = 'idle';
const IDLER_SIT = 'sit';
const IDLER_WORK = 'work';

interface Layer {
  m: LayerManifest;
  sprite: Sprite | AnimatedSprite;
}

/** 组装一个资产单位的可动场景（镜像 orchard 的分层 + 事件编排，但全由数据驱动）。 */
function buildComposite(
  manifest: AssetManifest,
  textures: Record<string, Texture>,
  tileSize: number,
): AssetSkinHandle {
  const view = new Container();
  const unit = tileSize / manifest.artGrid;
  const layers: Layer[] = [];

  for (const m of manifest.layers) {
    const sprite = makeSprite(m, textures);
    const [ax, ay] = m.anchor ?? [0.5, 1];
    sprite.anchor.set(ax, ay);
    sprite.scale.set(unit);
    sprite.position.set(m.pos[0] * unit, m.pos[1] * unit);
    view.addChild(sprite);
    applyAmbientMotion(m, sprite);
    layers.push({ m, sprite });
  }

  let bar: { view: Container; set: (p: number) => void } | null = null;
  if (manifest.progressBar) {
    bar = makeProgressBar(tileSize * manifest.progressBar.width);
    bar.view.position.set(
      manifest.progressBar.pos[0] * tileSize,
      manifest.progressBar.pos[1] * tileSize,
    );
    view.addChild(bar.view);
  }

  let level = 1;
  let phaseSec = 1;
  let cheering = false;

  // 把"本阶段时长"换成播放速度：周期快则演得快（镜像 orchard 的 spd）。
  const speed = (baseFps: number): number => {
    const f = phaseSec > 0 ? Math.min(3, Math.max(0.4, 0.5 / phaseSec)) : 1;
    return (baseFps * f) / 60;
  };

  const switchClip = (s: AnimatedSprite, frames: Texture[], spd: number, loop: boolean) => {
    if (frames.length === 0) return;
    s.textures = frames;
    s.animationSpeed = spd;
    s.loop = loop;
    s.gotoAndPlay(0);
  };

  const applyLevel = () => {
    for (const { m, sprite } of layers) {
      if (!(sprite instanceof AnimatedSprite)) continue;
      const base = m.fps ?? 4;
      if (m.behavior === 'worker') {
        sprite.animationSpeed = speed(base * level);
      } else if (m.behavior === 'idler') {
        const want = level >= (m.workAt ?? 3) ? IDLER_WORK : IDLER_SIT;
        switchClip(sprite, clipFrames(m, textures, want), speed(base), true);
      }
    }
  };
  applyLevel();

  return {
    view,
    setProgress: (p) => bar?.set(p),
    setQuoteMode: (on: boolean) => {
      if (bar) bar.view.visible = !on; // 投资类隐藏进度条
    },
    setPriceState: (state: PriceState) => {
      for (const { m, sprite } of layers) {
        if (m.behavior !== 'quote') continue;
        const frames = clipFrames(m, textures, state);
        if (frames.length === 0) continue;
        if (sprite instanceof AnimatedSprite) {
          switchClip(sprite, frames, (m.fps ?? 4) / 60, true);
        } else {
          sprite.texture = frames[0];
        }
      }
    },
    onEvent: (event: AssetEvent, ph?: number) => {
      if (event === 'harvest') {
        for (const { m, sprite } of layers) {
          if (m.popOnHarvest) harvestPop(sprite);
        }
        playHarvestCheer(layers, textures, () => cheering, (v) => (cheering = v), speed, level);
        return;
      }
      if (typeof ph === 'number' && ph > 0) phaseSec = ph;
      level = event === 'working1' ? 1 : event === 'working2' ? 2 : 3;
      if (!cheering) applyLevel();
    },
    destroy: () => {
      for (const { sprite } of layers) killMotion(sprite);
      killMotion(view);
      view.destroy({ children: true });
    },
  };
}

/** harvest：所有有 'harvest' 片段的 worker 播一次欢呼，再回 idle。 */
function playHarvestCheer(
  layers: Layer[],
  textures: Record<string, Texture>,
  isCheering: () => boolean,
  setCheering: (v: boolean) => void,
  speed: (fps: number) => number,
  level: number,
): void {
  if (isCheering()) return;
  const workers = layers.filter(
    (l) =>
      l.m.behavior === 'worker' &&
      l.sprite instanceof AnimatedSprite &&
      clipFrames(l.m, textures, WORKER_HARVEST).length > 0,
  );
  if (workers.length === 0) return;

  setCheering(true);
  let pending = workers.length;
  for (const { m, sprite } of workers) {
    const as = sprite as AnimatedSprite;
    as.textures = clipFrames(m, textures, WORKER_HARVEST);
    as.animationSpeed = 8 / 60;
    as.loop = false;
    as.gotoAndPlay(0);
    as.onComplete = () => {
      as.onComplete = undefined;
      const idle = clipFrames(m, textures, WORKER_IDLE);
      if (idle.length) {
        as.textures = idle;
        as.animationSpeed = speed((m.fps ?? 4) * level);
        as.loop = true;
        as.gotoAndPlay(0);
      }
      if (--pending <= 0) setCheering(false);
    };
  }
}

function makeSprite(m: LayerManifest, textures: Record<string, Texture>): Sprite | AnimatedSprite {
  const initial = initialFrames(m, textures);
  if (initial.length > 1) {
    const a = new AnimatedSprite(initial);
    a.animationSpeed = (m.fps ?? 4) / 60;
    a.play();
    return a;
  }
  return new Sprite(initial[0] ?? Texture.EMPTY);
}

function initialFrames(m: LayerManifest, textures: Record<string, Texture>): Texture[] {
  if (m.behavior === 'idler') {
    const sit = clipFrames(m, textures, IDLER_SIT);
    if (sit.length) return sit;
  }
  if (m.behavior === 'quote') {
    const plain = clipFrames(m, textures, 'plain');
    if (plain.length) return plain;
  }
  if (m.frames?.length) return mapFrames(m.frames, textures);
  if (m.clips) {
    const idle = m.clips[WORKER_IDLE] ?? Object.values(m.clips)[0];
    if (idle) return mapFrames(idle, textures);
  }
  return [];
}

function clipFrames(m: LayerManifest, textures: Record<string, Texture>, clip: string): Texture[] {
  const names = m.clips?.[clip];
  return names ? mapFrames(names, textures) : [];
}

function mapFrames(names: string[], textures: Record<string, Texture>): Texture[] {
  return names.map((n) => textures[n]).filter((t): t is Texture => Boolean(t));
}

function applyAmbientMotion(m: LayerManifest, sprite: Sprite | AnimatedSprite): void {
  if (m.motion === 'sway') sway(sprite);
  else if (m.motion === 'bob') bob(sprite);
  else if (m.motion === 'breathe') breathe(sprite);
}
