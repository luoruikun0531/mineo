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

/** 循环呼吸：缩放在 1 与 scale 之间来回 */
export function breathe(
  target: Container,
  scale = 1.06,
  o: LoopOptions = {},
): gsap.core.Tween {
  return gsap.to(target.scale, {
    x: scale,
    y: scale,
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
  target.scale.set(1);
  const tl = gsap.timeline();
  tl.to(target.scale, { x: 1.2, y: 0.82, duration: 0.09, ease: 'power2.out' })
    .to(target.scale, { x: 0.92, y: 1.14, duration: 0.12, ease: 'power1.inOut' })
    .to(target.scale, { x: 1, y: 1, duration: 0.22, ease: 'elastic.out(1, 0.5)' });
  return tl;
}

/** 杀掉某对象（及其 scale）上的所有补间——destroy 时调用，防泄漏 */
export function killMotion(target: Container): void {
  gsap.killTweensOf(target);
  gsap.killTweensOf(target.scale);
}
