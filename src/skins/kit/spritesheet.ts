import {
  AnimatedSprite,
  Assets,
  Container,
  Texture,
  type Spritesheet,
} from 'pixi.js';
import type { AssetSkinHandle } from '../types';
import { harvestPop, killMotion } from './motion';

/** 状态名 → 该状态的帧序列（idle / work / harvest …） */
export type StateFrames = Record<string, Texture[]>;

/**
 * 平台 SDK · 精灵图。
 * Aseprite/TexturePacker 导出 PNG+JSON → Pixi Spritesheet → 按状态分组的帧序列。
 */
export async function loadSpriteSheet(src: string): Promise<StateFrames> {
  const sheet = await Assets.load<Spritesheet>(src);
  // 像素风：最近邻缩放
  const first = Object.values(sheet.textures)[0];
  if (first) first.source.scaleMode = 'nearest';
  return sheet.animations;
}

export interface SpriteUnitOptions {
  tileSize: number;
  /** 单位相对格子的占比（高度），默认 0.7 */
  fit?: number;
  /** 帧率，默认 8 */
  fps?: number;
  /** 常驻状态名，默认 'idle' */
  idle?: string;
  /** 丰收状态名（播一次后回 idle），默认 'harvest' */
  harvest?: string;
}

export interface SpriteUnit extends AssetSkinHandle {
  /** 切换常驻状态（如 idle ↔ work） */
  setState: (name: string) => void;
}

/**
 * 由状态帧序列构建一个 AnimatedSprite 单位。
 * - 默认循环播放 idle；setState 切换常驻状态。
 * - onEvent('harvest')：若有 harvest 状态则播一次再回 idle，并叠加 GSAP 弹跳。
 * - 以 (0,0) 为格子中心（锚点底部偏上），自动按 tileSize 缩放。
 */
export function makeSpriteUnit(states: StateFrames, o: SpriteUnitOptions): SpriteUnit {
  const idleName = states[o.idle ?? 'idle'] ? (o.idle ?? 'idle') : Object.keys(states)[0];
  const harvestName = o.harvest ?? 'harvest';
  const view = new Container();

  const sprite = new AnimatedSprite(states[idleName]);
  sprite.anchor.set(0.5, 0.62);
  sprite.animationSpeed = (o.fps ?? 8) / 60;
  sprite.loop = true;
  sprite.play();

  // 适配格子尺寸
  const fit = (o.fit ?? 0.7) * o.tileSize;
  const base = Math.max(sprite.texture.width, sprite.texture.height) || 1;
  sprite.scale.set(fit / base);

  view.addChild(sprite);

  let current = idleName;
  const setState = (name: string) => {
    if (!states[name] || current === name) return;
    current = name;
    sprite.textures = states[name];
    sprite.loop = true;
    sprite.onComplete = undefined;
    sprite.gotoAndPlay(0);
  };

  return {
    view,
    setState,
    onEvent: (event) => {
      if (event !== 'harvest') return;
      harvestPop(view);
      if (states[harvestName]) {
        current = harvestName;
        sprite.textures = states[harvestName];
        sprite.loop = false;
        sprite.onComplete = () => {
          sprite.onComplete = undefined;
          current = idleName;
          sprite.textures = states[idleName];
          sprite.loop = true;
          sprite.gotoAndPlay(0);
        };
        sprite.gotoAndPlay(0);
      }
    },
    destroy: () => {
      killMotion(view);
      view.destroy({ children: true });
    },
  };
}

/**
 * 开发用：程序化生成占位帧（无需外部美术）。
 * 用于模板/演示，证明"加载帧 → AnimatedSprite → 状态 → 丰收"管线打通。
 * 真皮肤请用 loadSpriteSheet 加载 Aseprite 导出的 PNG+JSON。
 */
export function makeDebugFrames(px = 48, body = 0xc8553d): StateFrames {
  const idle = [0, 1, 2, 1].map((b) => frameTexture(px, (ctx) => drawWorker(ctx, px, body, b, false)));
  const harvest = [0, 1, 2].map((b) => frameTexture(px, (ctx) => drawWorker(ctx, px, body, b, true)));
  return { idle, harvest };
}

function frameTexture(px: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
  }
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

function drawWorker(
  ctx: CanvasRenderingContext2D,
  px: number,
  body: number,
  bob: number,
  cheer: boolean,
): void {
  const u = px / 16; // 16×16 像素网格
  const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * u), Math.round((y - bob) * u), Math.round(w * u), Math.round(h * u));
  };
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(Math.round(5 * u), Math.round(14 * u), Math.round(6 * u), Math.round(1.5 * u));
  // 腿
  r(6, 11, 1.6, 3, '#3b5a82');
  r(8.4, 11, 1.6, 3, '#3b5a82');
  // 躯干
  r(5.5, 7, 5, 5, hex(body));
  r(5.5, 9.5, 5, 2.5, '#466f9e');
  // 头 + 草帽
  r(6, 3.5, 4, 4, '#f0c089');
  r(4.8, 3, 6.4, 1.4, '#e7c66a');
  r(6.2, 1.8, 3.6, 1.6, '#e7c66a');
  // 手臂（cheer 时举起）
  if (cheer) {
    r(4.4, 4.5, 1.6, 3, hex(body));
    r(10, 4.5, 1.6, 3, hex(body));
    ctx.fillStyle = '#ffd24a'; // 丰收星点
    ctx.fillRect(Math.round(2 * u), Math.round((3 - bob) * u), Math.round(1.5 * u), Math.round(1.5 * u));
    ctx.fillRect(Math.round(12.5 * u), Math.round((3 - bob) * u), Math.round(1.5 * u), Math.round(1.5 * u));
  } else {
    r(4.4, 7.5, 1.6, 3, hex(body));
    r(10, 7.5, 1.6, 3, hex(body));
  }
}
