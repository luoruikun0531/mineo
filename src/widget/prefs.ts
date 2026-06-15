/**
 * 桌面挂件的本地显示偏好（透明度 / 黑白）。
 * 这是「皮肤之上的滤镜」，只影响这台机器上挂件的外观——
 * 不进资产快照、不参与云同步（web 端不该决定你桌面挂件多透明）。
 * 存独立的 localStorage key，与农场数据互不干扰。
 */
export interface WidgetPrefs {
  /** 整体不透明度 0.3–1（配合透明窗口可透出桌面） */
  opacity: number;
  /** 黑白滤镜 */
  grayscale: boolean;
}

const KEY = 'mineo:widgetprefs';
export const OPACITY_MIN = 0.3;
export const OPACITY_MAX = 1;

export function defaultWidgetPrefs(): WidgetPrefs {
  return { opacity: 1, grayscale: false };
}

function clampOpacity(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : OPACITY_MAX;
  return Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, n));
}

export function loadWidgetPrefs(): WidgetPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWidgetPrefs();
    const p = JSON.parse(raw) as Partial<WidgetPrefs>;
    return { opacity: clampOpacity(p.opacity), grayscale: Boolean(p.grayscale) };
  } catch {
    return defaultWidgetPrefs();
  }
}

export function saveWidgetPrefs(prefs: WidgetPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 配额/序列化错误：忽略（内存态仍在）
  }
}
