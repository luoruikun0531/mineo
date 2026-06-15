import { z } from 'zod';

/**
 * 图片皮肤包（manifest）的 schema 与类型。
 *
 * 皮肤 = `manifest.json` + 一组 PNG。解释器（runtime/interpretAsset.ts）据此把图片
 * 组装成会动的 AssetSkin。这是「AI 出图 → 皮肤」的数据契约：
 *   - 美术全部来自 PNG（可由 AI 生成），不再有 canvas 手绘。
 *   - 布局/行为来自这份声明；动效由解释器程序化施加（作者只需出静图）。
 */

const tuple2 = z.tuple([z.number(), z.number()]);
const Localized = z.object({ en: z.string(), zh: z.string() });

/**
 * 单层行为预设：决定它如何响应 working1/2/3、harvest、进度。
 * 作者只需「给图 + 选一个 behavior」：
 *  - static  纯展示（草地、果筐…），可叠加环境动作；可选 harvest 弹跳。
 *  - plant   作物/树：默认有环境动作，harvest 弹跳。
 *  - worker  工人：循环 idle 片段，工作档位越高播得越快；harvest 播一次 'harvest' 片段再回 idle。
 *  - idler   偷懒者：低档位播 'sit'，到 workAt 档位切 'work'。
 */
export const LayerBehavior = z.enum(['static', 'plant', 'worker', 'idler']);
export type LayerBehavior = z.infer<typeof LayerBehavior>;

/** 环境动作：叠加在（通常是静态）层上的循环动效。 */
export const AmbientMotion = z.enum(['none', 'sway', 'bob', 'breathe']);
export type AmbientMotion = z.infer<typeof AmbientMotion>;

export const LayerSchema = z.object({
  id: z.string(),
  behavior: LayerBehavior.default('static'),
  /** 简单循环帧（单帧即静图）。与 clips 二选一。 */
  frames: z.array(z.string()).optional(),
  /** 命名片段：worker 用 idle/harvest，idler 用 sit/work…。与 frames 二选一。 */
  clips: z.record(z.string(), z.array(z.string())).optional(),
  /** 位置（artGrid 逻辑像素单位，相对单位中心）。 */
  pos: tuple2,
  /** 锚点，默认 [0.5, 1]（底部居中）。 */
  anchor: tuple2.optional(),
  /** 基础帧率，默认 4。 */
  fps: z.number().positive().optional(),
  /** 环境动作（叠加循环动效）。 */
  motion: AmbientMotion.default('none'),
  /** harvest 时是否弹跳（squash & stretch）。 */
  popOnHarvest: z.boolean().default(false),
  /** idler 专用：达到该工作档位（1/2/3）才从 sit 切到 work，默认 3。 */
  workAt: z.number().int().min(1).max(3).optional(),
});
export type LayerManifest = z.infer<typeof LayerSchema>;

/** 头顶成熟度进度条（皮肤的一部分，引擎喂值）。 */
export const ProgressBarSchema = z.object({
  /** 位置（tile 占比，相对单位中心）。 */
  pos: tuple2,
  /** 宽度（tile 占比，如 0.6）。 */
  width: z.number().positive(),
});

/** 资产皮肤包清单。 */
export const AssetManifestSchema = z.object({
  format: z.literal('mineo-skin@1'),
  kind: z.literal('asset'),
  id: z.string(),
  name: Localized,
  version: z.string(),
  /** 每个 tile 多少 artGrid 逻辑像素（与图素分辨率一致，保证颗粒统一）。 */
  artGrid: z.number().positive(),
  /** 是否像素风（最近邻采样）；AI 平滑美术设 false（线性采样）。 */
  pixelated: z.boolean().default(true),
  layers: z.array(LayerSchema).min(1),
  progressBar: ProgressBarSchema.optional(),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;

/** 校验任意 JSON 为合法资产皮肤清单；失败抛出（用于下载/加载边界）。 */
export function parseAssetManifest(data: unknown): AssetManifest {
  return AssetManifestSchema.parse(data);
}

/** manifest 引用到的全部帧名（frames + 所有 clips 去重）。加载器据此取 PNG。 */
export function assetFrameNames(manifest: AssetManifest): string[] {
  const set = new Set<string>();
  for (const layer of manifest.layers) {
    layer.frames?.forEach((f) => set.add(f));
    if (layer.clips) {
      for (const arr of Object.values(layer.clips)) arr.forEach((f) => set.add(f));
    }
  }
  return [...set];
}
