import type { Container } from 'pixi.js';
import type { Language } from '@/domain/types';

/** 多语言名字 */
export type Localized = Record<Language, string>;

/**
 * 一个可动画的场景片段。皮肤构建后返回它：
 * - view：挂到舞台上的 Pixi 容器
 * - update：每帧推进动画（dt 秒）
 * - destroy：清理资源（纹理/事件）
 */
export interface SceneHandle {
  view: Container;
  /** 场景内容尺寸（用于居中）；缺省时由调用方按包围盒推断 */
  size?: { width: number; height: number };
  /** 可种植方格区域在 view 局部坐标中的原点与格尺寸（资产落位用） */
  plot?: { x: number; y: number; tileSize: number };
  update?: (dtSeconds: number) => void;
  destroy?: () => void;
}

/** UI 主题色板（写入 CSS 变量，驱动 React HUD 外观） */
export interface UITokens {
  skyTop: string;
  skyBottom: string;
  panel: string;
  panelBorder: string;
  highlight: string;
  ink: string;
  harvestText: string;
  fontFamily?: string;
}

export interface GridSpec {
  cols: number;
  rows: number;
  tileSize: number;
}

/**
 * 土地 + UI 皮肤。主界面按钮可切换 / 替换。
 * buildLand 返回动画化的土地场景；ui 提供 HUD 外观 token。
 * 之后用户可注册自己把关的素材皮肤来替换默认实现。
 */
export interface ThemeSkin {
  id: string;
  name: Localized;
  /** 单格世界像素尺寸（格子数由资产数量动态决定，见 store.gridNFor） */
  tileSize: number;
  /** Pixi 画布背景色（0xRRGGBB） */
  canvasBackground: number;
  /** 按给定的方格规格构建土地（cols=rows=n 动态传入） */
  buildLand: (grid: GridSpec) => SceneHandle;
  /** 可选：全屏皮肤背景（屏幕空间，铺满视野；土地在其之上居中）。让"整个页面都是皮肤"。 */
  buildBackdrop?: (width: number, height: number) => SceneHandle;
  ui: UITokens;
}

/** 资产皮肤构建参数 */
export interface AssetSkinContext {
  /** 单格像素尺寸，单位视觉据此适配 */
  tileSize: number;
}

/**
 * 主程序 → 资产皮肤 的抽象事件。主程序只发"发生了什么/现在什么状态"，
 * 绝不关心皮肤用什么素材/帧/GSAP 去表现。映射（主程序按进度发，皮肤自己演）：
 *  - working1  进度 < 25%   （刚开工，节奏轻）
 *  - working2  进度 < 50%   （干起来了）
 *  - working3  进度 < 75%（含 75%~100%）（冲刺，最忙）
 *  - harvest   进度满，丰收一次（之后主程序会重置回 working1）
 * 每个资产皮肤都应为这 4 个事件实现对应的动画编排。新增事件在此扩展即可。
 */
export type AssetEvent = 'working1' | 'working2' | 'working3' | 'harvest';

/** 资产进度（0..1）→ 抽象事件。供主程序在驱动进度时翻译用；皮肤不接触进度。 */
export function assetEventForProgress(progress: number): AssetEvent {
  if (progress >= 1) return 'harvest';
  if (progress < 0.25) return 'working1';
  if (progress < 0.5) return 'working2';
  return 'working3';
}

/**
 * 资产皮肤实例。架构铁律：
 * - 主程序只通过 onEvent 发抽象事件、通过 update 转发时钟；只知道"现在什么状态"。
 * - 素材是什么、怎么编排、是否用 GSAP、是像素还是日漫——全部封装在皮肤包内部，主程序不感知。
 *
 * onEvent 第二参 phaseSec：本阶段将持续多少秒（动态，随收成周期变化）。
 * 皮肤据此把该阶段动画**铺满这段时长**——周期快则演得快，周期慢则演得慢，无固定时长。
 */
export interface AssetSkinHandle extends SceneHandle {
  onEvent?: (event: AssetEvent, phaseSec?: number) => void;
  /** 引擎每帧告知当前收成进度 0..1；皮肤据此更新自己的进度条（进度条是皮肤的一部分）。 */
  setProgress?: (progress: number) => void;
}

/**
 * 单个资产的外观皮肤。添加 / 编辑资产时可选择 / 替换。
 * build 返回动画化的单位视觉。
 */
export interface AssetSkin {
  id: string;
  name: Localized;
  /**
   * 可选：一次性预加载资源（精灵图 PNG/JSON 等）。
   * 引擎在首次 build() 前会 await 所有皮肤的 load()，因此 build() 保持同步。
   * 程序化皮肤无需实现。
   */
  load?: () => Promise<void>;
  build: (ctx: AssetSkinContext) => AssetSkinHandle;
}
