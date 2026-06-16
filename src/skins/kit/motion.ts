import type { Container } from 'pixi.js';
import { gsap } from 'gsap';

/**
 * 平台 SDK · 运动（基于 GSAP）。
 * 用声明式补间替代手写 sin/lerp。直接补间 Pixi 对象属性（v8 安全，无需 PixiPlugin）。
 *
 * 重要：不要对【同一属性】既用本模块补间、又在 update(dt) 里逐帧赋值——两者会打架。
 * 精灵图皮肤天然没有逐帧赋值，最适合用 GSAP 做点缀动画。
 */
export { gsap };

export interface LoopOptions {
  /** 单程时长（秒） */
  duration?: number;
  /** 错峰：延迟开始（秒） */
  delay?: number;
  ease?: string;
}

/**
 * 基准缩放台账：breathe/harvestPop 要在「精灵当前缩放」之上做相对补间，而非假设基准是 1。
 * AI 高清图按 size 归一后基准是个小数（如 0.18）；若仍补到绝对 1.06 会爆成原生大小。
 * 在 buildComposite 设好初始缩放后调 setBaseScale 记账，动效便相对它伸缩。
 */
const baseScale = new WeakMap<Container, { x: number; y: number }>();

/** 记录对象当前缩放为基准（供 breathe/harvestPop 相对补间）。设好初始 scale 后调用。 */
export function setBaseScale(target: Container): void {
  baseScale.set(target, { x: target.scale.x, y: target.scale.y });
}

function baseOf(target: Container): { x: number; y: number } {
  return baseScale.get(target) ?? { x: target.scale.x, y: target.scale.y };
}

/** 循环呼吸：缩放在基准与基准×scale 之间来回 */
export function breathe(
  target: Container,
  scale = 1.06,
  o: LoopOptions = {},
): gsap.core.Tween {
  const b = baseOf(target);
  return gsap.to(target.scale, {
    x: b.x * scale,
    y: b.y * scale,
    duration: o.duration ?? 1.4,
    delay: o.delay ?? 0,
    ease: o.ease ?? 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

/** 循环摇摆：旋转在 ±angle 之间来回（弧度） */
export function sway(
  target: Container,
  angle = 0.06,
  o: LoopOptions = {},
): gsap.core.Tween {
  target.rotation = -angle;
  return gsap.to(target, {
    rotation: angle,
    duration: o.duration ?? 1.6,
    delay: o.delay ?? 0,
    ease: o.ease ?? 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

/**
 * 来回巡逻：水平左右踱步，并在折返点翻转朝向（保安巡查 / 仆人来回扫地）。
 * dist 为单边位移（像素）。用 timeline 显式两腿，折返用 set 翻转 scale.x 符号。
 * 注意：会写 target.x 与 target.scale.x 的符号，勿对同一层再叠加会改这两者的动效。
 */
export function patrol(
  target: Container,
  dist = 12,
  o: LoopOptions = {},
): gsap.core.Timeline {
  const baseX = target.x;
  const sx = Math.abs(target.scale.x) || 1; // 朝向幅度（保留 size 归一后的缩放）
  const dur = o.duration ?? 2.4;
  const ease = o.ease ?? 'sine.inOut';
  target.x = baseX - dist;
  target.scale.x = sx; // 先朝右走
  const tl = gsap.timeline({ repeat: -1, delay: o.delay ?? 0 });
  tl.to(target, { x: baseX + dist, duration: dur, ease })
    .set(target.scale, { x: -sx }) // 折返：朝左
    .to(target, { x: baseX - dist, duration: dur, ease })
    .set(target.scale, { x: sx }); // 折返：朝右
  return tl;
}

/** 循环上下浮动：y 在 baseY±dist 之间来回 */
export function bob(
  target: Container,
  dist = 3,
  o: LoopOptions = {},
): gsap.core.Tween {
  const baseY = target.y;
  target.y = baseY - dist;
  return gsap.to(target, {
    y: baseY + dist,
    duration: o.duration ?? 1.0,
    delay: o.delay ?? 0,
    ease: o.ease ?? 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

/**
 * 丰收弹跳：一次性 squash & stretch + 轻跳。用于皮肤的 onEvent('harvest')。
 * 会先清掉该对象上残留的弹跳补间，避免叠加漂移。
 */
export function harvestPop(target: Container): gsap.core.Timeline {
  gsap.killTweensOf(target.scale);
  const b = baseOf(target); // 相对基准缩放，适配 size 归一后的高清图（基准非 1）
  target.scale.set(b.x, b.y);
  const tl = gsap.timeline();
  tl.to(target.scale, { x: b.x * 1.2, y: b.y * 0.82, duration: 0.09, ease: 'power2.out' })
    .to(target.scale, { x: b.x * 0.92, y: b.y * 1.14, duration: 0.12, ease: 'power1.inOut' })
    .to(target.scale, { x: b.x, y: b.y, duration: 0.22, ease: 'elastic.out(1, 0.5)' });
  return tl;
}

/** 杀掉某对象（及其 scale）上的所有补间——destroy 时调用，防泄漏 */
export function killMotion(target: Container): void {
  gsap.killTweensOf(target);
  gsap.killTweensOf(target.scale);
}
