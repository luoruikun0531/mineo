/** 方格落位计算（资产 index → 单元中心的 view 局部坐标） */

export interface PlotInfo {
  x: number;
  y: number;
  tileSize: number;
}

export interface SceneSize {
  width: number;
  height: number;
}

/**
 * 资产 index 在 n×n 方格中的中心坐标，
 * 已换算到"以场景中心为原点"的世界坐标（与相机对齐）。
 */
export function cellCenter(
  index: number,
  n: number,
  plot: PlotInfo,
  scene: SceneSize,
): { x: number; y: number } {
  const col = index % n;
  const row = Math.floor(index / n);
  return {
    x: plot.x + (col + 0.5) * plot.tileSize - scene.width / 2,
    y: plot.y + (row + 0.5) * plot.tileSize - scene.height / 2,
  };
}
