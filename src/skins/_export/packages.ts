import { exportOrchard, exportWheat } from './exportProcedural';
import { parseAssetManifest, type AssetManifest } from '../format/manifest';

/**
 * 把老的程序化皮肤定义成图片皮肤包（manifest + 导出的 PNG）。
 * 这是「老皮肤 → 范例图片包」的来源：dev 期把它落盘成 public/skins/<id>/，
 * 之后运行时只读那些 PNG + manifest.json，不再跑这里的程序化代码。
 */
export interface BuiltPackage {
  id: string;
  manifest: AssetManifest;
  /** 帧名 → dataURL（落盘时写成 <帧名>.png）。 */
  images: Record<string, string>;
}

/** 果园：分层（草地/三棵果树/两采摘工/偷懒者/果筐）+ 头顶进度条。 */
export function orchardPackage(): BuiltPackage {
  const images = exportOrchard();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();

  const manifest = parseAssetManifest({
    format: 'mineo-skin@1',
    kind: 'asset',
    id: 'orchard',
    name: { en: 'Orchard', zh: '果园' },
    version: '1.0.0',
    artGrid: 46,
    pixelated: true,
    layers: [
      { id: 'grass', behavior: 'static', frames: ['grass'], pos: [0, -1], anchor: [0.5, 0.5] },
      { id: 'tree0', behavior: 'plant', frames: byPrefix('tree0_'), pos: [-13, 5], anchor: [0.5, 1], fps: 1.2, popOnHarvest: true },
      { id: 'tree1', behavior: 'plant', frames: byPrefix('tree1_'), pos: [-1, 3], anchor: [0.5, 1], fps: 1.5, popOnHarvest: true },
      { id: 'tree2', behavior: 'plant', frames: byPrefix('tree2_'), pos: [12, 5], anchor: [0.5, 1], fps: 1.8, popOnHarvest: true },
      { id: 'picker0', behavior: 'worker', clips: { idle: byPrefix('picker0_idle_'), harvest: byPrefix('picker0_harvest_') }, pos: [-9, 13], anchor: [0.5, 1], fps: 4 },
      { id: 'picker1', behavior: 'worker', clips: { idle: byPrefix('picker1_idle_'), harvest: byPrefix('picker1_harvest_') }, pos: [4, 14], anchor: [0.5, 1], fps: 4 },
      { id: 'lazy', behavior: 'idler', clips: { sit: byPrefix('lazy_sit_'), work: byPrefix('lazy_work_'), harvest: byPrefix('lazy_harvest_') }, pos: [15, 13], anchor: [0.5, 1], fps: 1.5, workAt: 3 },
      { id: 'crateA', behavior: 'static', frames: ['crate'], pos: [17, 12], anchor: [0.5, 1] },
      { id: 'crateB', behavior: 'static', frames: ['crate'], pos: [17, 6], anchor: [0.5, 1] },
    ],
    progressBar: { pos: [0, -0.44], width: 0.6 },
  });

  return { id: 'orchard', manifest, images };
}

/** 麦田场：耕地 + 一排麦子（plant）+ 锄地工（worker）+ 偷懒者（idler）+ 粮袋。 */
export function wheatPackage(): BuiltPackage {
  const images = exportWheat();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();

  const manifest = parseAssetManifest({
    format: 'mineo-skin@1',
    kind: 'asset',
    id: 'wheat-farm',
    name: { en: 'Wheat Farm', zh: '麦田场' },
    version: '1.0.0',
    artGrid: 46,
    pixelated: true,
    layers: [
      { id: 'ground', behavior: 'static', frames: ['ground'], pos: [0, -1], anchor: [0.5, 0.5] },
      { id: 'wheat0', behavior: 'plant', frames: byPrefix('wheat_'), pos: [-13, 0], anchor: [0.5, 1], fps: 2, popOnHarvest: true },
      { id: 'wheat1', behavior: 'plant', frames: byPrefix('wheat_'), pos: [-6, 0], anchor: [0.5, 1], fps: 2.4, popOnHarvest: true },
      { id: 'wheat2', behavior: 'plant', frames: byPrefix('wheat_'), pos: [1, 0], anchor: [0.5, 1], fps: 2.8, popOnHarvest: true },
      { id: 'wheat3', behavior: 'plant', frames: byPrefix('wheat_'), pos: [8, 0], anchor: [0.5, 1], fps: 3.2, popOnHarvest: true },
      { id: 'hoe', behavior: 'worker', clips: { idle: byPrefix('hoe_idle_'), harvest: byPrefix('hoe_harvest_') }, pos: [-10, 12], anchor: [0.5, 1], fps: 4 },
      { id: 'lazy', behavior: 'idler', clips: { sit: byPrefix('lazy_sit_'), work: byPrefix('lazy_work_'), harvest: byPrefix('lazy_harvest_') }, pos: [12, 13], anchor: [0.5, 1], fps: 1.5, workAt: 3 },
      { id: 'sack', behavior: 'static', frames: ['sack'], pos: [18, 11], anchor: [0.5, 1] },
    ],
    progressBar: { pos: [0, -0.42], width: 0.6 },
  });

  return { id: 'wheat-farm', manifest, images };
}

/** 所有待落盘的老资产皮肤包（主题由 themePackages 单独处理）。 */
export function allBuiltPackages(): BuiltPackage[] {
  return [orchardPackage(), wheatPackage()];
}
