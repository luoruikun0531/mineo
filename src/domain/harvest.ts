/**
 * 收成节流算法 —— 项目体验核心。
 * 见 docs/03-HARVEST-ALGORITHM.md。
 *
 * 约束：
 *  - C1 进度条满频率最快 1s 一次（周期 D ≥ 1s）
 *  - C2 每次弹出 X 为整数且 ≥ 1
 *  - C3 快→每 ~0.5s 弹大数；慢→攒够 1 再弹
 *  - C4 长期弹出速率 = 真实速率 r（零漂移）
 */

export const T_MIN = 1.0; // 秒，频率上限（最快 1 秒丰收一次）

export interface HarvestState {
  /** 每秒速率（展示单位），随资产/模式变化重算 */
  r: number;
  /** 当前周期目标金额（整数 ≥ 1） */
  X: number;
  /** 当前周期时长（秒，≥ T_MIN） */
  D: number;
  /** 本周期已过时间（秒） */
  elapsed: number;
}

/**
 * 由速率 r 初始化收成周期。
 * X = max(1, ceil(r * T_MIN))，D = X / r。
 * r <= 0 视为不产出（X=1, D=Infinity，进度条不动）。
 */
export function initHarvest(r: number): HarvestState {
  if (!Number.isFinite(r) || r <= 0) {
    return { r: r > 0 ? r : 0, X: 1, D: Infinity, elapsed: 0 };
  }
  const X = Math.max(1, Math.ceil(r * T_MIN));
  return { r, X, D: X / r, elapsed: 0 };
}

/** 当前进度条填充比例 0..1 */
export function progress(s: HarvestState): number {
  if (!Number.isFinite(s.D) || s.D <= 0) return 0;
  return Math.min(1, s.elapsed / s.D);
}

/**
 * 前进 dt 秒。每跨过一个周期 D 就回调 onHarvest(X) 一次。
 * 用 while 处理一帧跨多周期（卡顿/标签页恢复）。
 * 返回本次累计弹出的总额（便于汇总）。
 */
export function tickHarvest(
  s: HarvestState,
  dt: number,
  onHarvest: (x: number) => void,
): number {
  if (!Number.isFinite(s.D) || s.D <= 0 || dt <= 0) return 0;
  s.elapsed += dt;
  let total = 0;
  while (s.elapsed >= s.D) {
    s.elapsed -= s.D;
    onHarvest(s.X);
    total += s.X;
  }
  return total;
}
