import type { Container } from 'pixi.js';
import type { SceneSize } from './layout';

const PAD = 80; // 视口留白（小留白 → 土地更大）
const MAX_SCALE = 2.6; // 2×2 时的最大放大（视野最低、格子最大、占满视野）
const BASE_ZOOM = 2.6; // n=2 期望缩放；随 n 拉高视野
const SMOOTH = 6; // 缩放/平移平滑速度（越大越快）

/**
 * 相机：把世界中的某个焦点对齐到视口中心并缩放。
 * 默认聚焦场景中心 (0,0)、按格子数 n 缩放；widget 模式可改为只框住格子区（setFrame）。
 * 目标值指数平滑逼近 → 扩张/切换平滑过渡。
 */
export class Camera {
  private scale = MAX_SCALE;
  private tScale = MAX_SCALE;
  private cx = 0;
  private cy = 0; // 当前焦点（对齐到视口中心的世界点）
  private tcx = 0;
  private tcy = 0; // 目标焦点
  private viewportW = 1;
  private viewportH = 1;

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
  }

  /** 全景：聚焦场景中心，按格子数 n 缩放（fit 与期望缩放取小） */
  setTarget(scene: SceneSize, n: number): void {
    const fit = Math.min(
      (this.viewportW - PAD) / scene.width,
      (this.viewportH - PAD) / scene.height,
    );
    const desired = BASE_ZOOM * (2 / n);
    this.tScale = Math.max(0.4, Math.min(fit, desired, MAX_SCALE));
    this.tcx = 0;
    this.tcy = 0;
  }

  /** 只框住一个世界矩形（中心 cx,cy，尺寸 w×h）—— widget 只看格子区。 */
  setFrame(cx: number, cy: number, w: number, h: number, pad = 20): void {
    const fit = Math.min(
      (this.viewportW - pad) / w,
      (this.viewportH - pad) / h,
    );
    this.tScale = Math.max(0.2, fit);
    this.tcx = cx;
    this.tcy = cy;
  }

  /** 立即跳到目标（首次构建用，避免开场突兀） */
  snap(): void {
    this.scale = this.tScale;
    this.cx = this.tcx;
    this.cy = this.tcy;
  }

  update(dt: number, world: Container): void {
    const k = Math.min(1, dt * SMOOTH);
    this.scale += (this.tScale - this.scale) * k;
    this.cx += (this.tcx - this.cx) * k;
    this.cy += (this.tcy - this.cy) * k;
    world.scale.set(this.scale);
    world.position.set(
      this.viewportW / 2 - this.cx * this.scale,
      this.viewportH / 2 - this.cy * this.scale,
    );
  }
}
