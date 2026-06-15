import { exportOrchard, exportTheme, exportWheat } from './exportProcedural';
import { exportBank, exportVilla, exportOffice, exportFactory, exportStock } from './buildings';
import type { StockCompany } from './stockArt';
import {
  parseAssetManifest,
  parseThemeManifest,
  type AssetManifest,
  type ThemeManifest,
} from '../format/manifest';
import type { LandPalette, SkyPalette } from '../kit';

/** 投资类 7 档涨跌箭头的 quote clips（办公室/工厂/股票共用）。 */
const QUOTE_CLIPS: Record<string, string[]> = {
  up3: ['up3'], up2: ['up2'], up1: ['up1'], plain: ['plain'],
  down1: ['down1'], down2: ['down2'], down3: ['down3'],
};

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

/** 银行（存款）：门面 breathe + 旋转金币 + 闪烁招牌 + 柜员（worker）+ 进度条。 */
export function bankPackage(): BuiltPackage {
  const images = exportBank();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();
  const manifest = parseAssetManifest({
    format: 'mineo-skin@1', kind: 'asset', id: 'bank',
    name: { en: 'Bank', zh: '银行' }, version: '1.0.0', artGrid: 46, pixelated: true,
    layers: [
      { id: 'plaza', behavior: 'static', frames: ['plaza'], pos: [0, -1], anchor: [0.5, 0.5] },
      { id: 'building', behavior: 'static', frames: ['building'], pos: [0, 9], anchor: [0.5, 1], motion: 'breathe' },
      { id: 'sign', behavior: 'static', frames: byPrefix('sign_'), fps: 1.5, pos: [-15, -2], anchor: [0.5, 1] },
      { id: 'coin', behavior: 'static', frames: byPrefix('coin_'), fps: 6, pos: [15, -7], anchor: [0.5, 0.5], motion: 'bob' },
      { id: 'clerk', behavior: 'worker', clips: { idle: byPrefix('clerk_idle_'), harvest: byPrefix('clerk_harvest_') }, pos: [13, 13], anchor: [0.5, 1], fps: 4 },
    ],
    progressBar: { pos: [0, -0.46], width: 0.55 },
  });
  return { id: 'bank', manifest, images };
}

/** 别墅（房产）：屋宇 breathe + 摇摆树 + 烟囱烟 + 泳池波光 + 园丁（worker）+ 进度条。 */
export function villaPackage(): BuiltPackage {
  const images = exportVilla();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();
  const manifest = parseAssetManifest({
    format: 'mineo-skin@1', kind: 'asset', id: 'villa',
    name: { en: 'Villa', zh: '别墅' }, version: '1.0.0', artGrid: 46, pixelated: true,
    layers: [
      { id: 'lawn', behavior: 'static', frames: ['lawn'], pos: [0, -1], anchor: [0.5, 0.5] },
      { id: 'tree', behavior: 'plant', frames: byPrefix('tree_'), pos: [-15, 7], anchor: [0.5, 1], fps: 1.4, motion: 'sway' },
      { id: 'house', behavior: 'static', frames: ['house'], pos: [3, 9], anchor: [0.5, 1], motion: 'breathe' },
      { id: 'smoke', behavior: 'static', frames: byPrefix('smoke_'), fps: 3, pos: [13, -14], anchor: [0.5, 1] },
      { id: 'pool', behavior: 'static', frames: byPrefix('pool_'), fps: 2, pos: [-11, 13], anchor: [0.5, 0.5] },
      { id: 'gardener', behavior: 'worker', clips: { idle: byPrefix('gardener_idle_'), harvest: byPrefix('gardener_harvest_') }, pos: [14, 14], anchor: [0.5, 1], fps: 4 },
    ],
    progressBar: { pos: [0, -0.46], width: 0.55 },
  });
  return { id: 'villa', manifest, images };
}

/** 办公室（投资默认）：写字楼 + 闪烁窗 + 楼顶信标 + 7 档涨跌箭头（无进度条）。 */
export function officePackage(): BuiltPackage {
  const images = exportOffice();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();
  const manifest = parseAssetManifest({
    format: 'mineo-skin@1', kind: 'asset', id: 'office',
    name: { en: 'Office', zh: '办公室' }, version: '1.0.0', artGrid: 46, pixelated: true,
    layers: [
      { id: 'pavement', behavior: 'static', frames: ['pavement'], pos: [0, 1], anchor: [0.5, 0.5] },
      { id: 'tower', behavior: 'static', frames: ['tower'], pos: [0, 7], anchor: [0.5, 1] },
      { id: 'windows', behavior: 'static', frames: byPrefix('win_'), fps: 1.4, pos: [0, 7], anchor: [0.5, 1] },
      { id: 'antenna', behavior: 'static', frames: byPrefix('ant_'), fps: 1.5, pos: [0, -18], anchor: [0.5, 1], motion: 'bob' },
      { id: 'arrow', behavior: 'quote', clips: QUOTE_CLIPS, pos: [0, -27], anchor: [0.5, 0.5] },
    ],
  });
  return { id: 'office', manifest, images };
}

/** 工厂（投资默认）：厂房 + 旋转齿轮 + 双烟囱冒烟 + 7 档涨跌箭头（无进度条）。 */
export function factoryPackage(): BuiltPackage {
  const images = exportFactory();
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();
  const manifest = parseAssetManifest({
    format: 'mineo-skin@1', kind: 'asset', id: 'factory',
    name: { en: 'Factory', zh: '工厂' }, version: '1.0.0', artGrid: 46, pixelated: true,
    layers: [
      { id: 'pavement', behavior: 'static', frames: ['pavement'], pos: [0, 1], anchor: [0.5, 0.5] },
      { id: 'factory', behavior: 'static', frames: ['factory'], pos: [0, 7], anchor: [0.5, 1] },
      { id: 'smokeL', behavior: 'static', frames: byPrefix('smoke_'), fps: 3, pos: [-13, -18], anchor: [0.5, 1] },
      { id: 'smokeR', behavior: 'static', frames: byPrefix('smoke_'), fps: 3, pos: [11, -22], anchor: [0.5, 1] },
      { id: 'gear', behavior: 'static', frames: byPrefix('gear_'), fps: 5, pos: [-3, -4], anchor: [0.5, 0.5] },
      { id: 'arrow', behavior: 'quote', clips: QUOTE_CLIPS, pos: [0, -25], anchor: [0.5, 0.5] },
    ],
  });
  return { id: 'factory', manifest, images };
}

/** 所有待落盘的老资产皮肤包（主题由 allBuiltThemePackages 单独处理）。 */
export function allBuiltPackages(): BuiltPackage[] {
  return [orchardPackage(), wheatPackage()];
}

/** 新增「建筑」皮肤包：银行/别墅/办公室/工厂（按类别 scope）。 */
export function allBuildingPackages(): BuiltPackage[] {
  return [bankPackage(), villaPackage(), officePackage(), factoryPackage()];
}

// ---- 主题（土地 + 天空）皮肤包 ----

const hexStr = (n: number): string => '#' + n.toString(16).padStart(6, '0');

export interface BuiltThemePackage {
  id: string;
  manifest: ThemeManifest;
  images: Record<string, string>;
}

const dayPalette: LandPalette = {
  grass: 0xa8c66c, grassDark: 0x8fb85a, ground: 0xb6d07a, groundShade: 0x88a64f, path: 0xc9a06b,
  plotLight: 0xb98a5a, plotDark: 0x9e7144, furrow: 0x7a5532, fence: 0xe6c79a, fenceShade: 0xa9824f,
  trunk: 0x8a5a34, leaf: 0x6fae4f, leafDark: 0x568a3c, flowerA: 0xff9ec2, flowerB: 0xffd24a,
  flowerCore: 0xfff2c0, water: 0x6fc6d6, waterLight: 0xa7e4ee, cloud: 0xfff6e6, sunGlow: 0xfff1b8,
};
const daySky: SkyPalette = {
  skyTop: 0xffe9b8, skyBottom: 0xffd28a, cloud: dayPalette.cloud, sun: dayPalette.sunGlow,
  hill: dayPalette.grass, hillDark: dayPalette.grassDark,
};

/** 田园·白昼。 */
export function pastoralDayPackage(): BuiltThemePackage {
  const images = exportTheme(dayPalette, daySky);
  const manifest = parseThemeManifest({
    format: 'mineo-skin@1', kind: 'theme', id: 'pastoral-day',
    name: { en: 'Pastoral · Day', zh: '田园 · 白昼' }, version: '1.0.0',
    tileSize: 104, canvasBackground: '#ffd28a', pixelated: true,
    land: { ground: hexStr(dayPalette.ground), groundShade: hexStr(dayPalette.groundShade), path: hexStr(dayPalette.path) },
    sky: { skyTop: hexStr(daySky.skyTop), skyBottom: hexStr(daySky.skyBottom), sun: hexStr(daySky.sun), hill: hexStr(daySky.hill), hillDark: hexStr(daySky.hillDark) },
    ui: { skyTop: '#ffe9b8', skyBottom: '#ffd28a', panel: '#c98a4b', panelBorder: '#7a4e25', highlight: '#fff6d8', ink: '#4a3526', harvestText: '#ffb300' },
  });
  return { id: 'pastoral-day', manifest, images };
}

const duskPalette: LandPalette = {
  grass: 0x8f9d6b, grassDark: 0x77885a, ground: 0x9aa073, groundShade: 0x6f7a4f, path: 0xb98c63,
  plotLight: 0xa07650, plotDark: 0x82603d, furrow: 0x5e4128, fence: 0xd9b48a, fenceShade: 0x916a44,
  trunk: 0x6f4a2c, leaf: 0x5f8a52, leafDark: 0x466239, flowerA: 0xe487b4, flowerB: 0xf2b35e,
  flowerCore: 0xffe7bd, water: 0x5f93c2, waterLight: 0x93bfe0, cloud: 0xf3d9bf, sunGlow: 0xffd59a,
};
const duskSky: SkyPalette = {
  skyTop: 0xffd9a0, skyBottom: 0xe89a73, cloud: duskPalette.cloud, sun: duskPalette.sunGlow,
  hill: duskPalette.grass, hillDark: duskPalette.grassDark,
};

/** 田园·黄昏。 */
export function pastoralDuskPackage(): BuiltThemePackage {
  const images = exportTheme(duskPalette, duskSky);
  const manifest = parseThemeManifest({
    format: 'mineo-skin@1', kind: 'theme', id: 'pastoral-dusk',
    name: { en: 'Pastoral · Dusk', zh: '田园 · 黄昏' }, version: '1.0.0',
    tileSize: 104, canvasBackground: '#e89a73', pixelated: true,
    land: { ground: hexStr(duskPalette.ground), groundShade: hexStr(duskPalette.groundShade), path: hexStr(duskPalette.path) },
    sky: { skyTop: hexStr(duskSky.skyTop), skyBottom: hexStr(duskSky.skyBottom), sun: hexStr(duskSky.sun), hill: hexStr(duskSky.hill), hillDark: hexStr(duskSky.hillDark) },
    ui: { skyTop: '#ffd9a0', skyBottom: '#e89a73', panel: '#a96a3f', panelBorder: '#5e3620', highlight: '#ffe9cf', ink: '#3a271b', harvestText: '#ff9a3c' },
  });
  return { id: 'pastoral-dusk', manifest, images };
}

/** 所有待落盘的老主题皮肤包。 */
export function allBuiltThemePackages(): BuiltThemePackage[] {
  return [pastoralDayPackage(), pastoralDuskPackage()];
}

// ---- 股票占位皮肤（投资类，quote 7 档涨跌动画，scope 到各自代码）----

export interface BuiltStockPackage {
  symbol: string;
  pkg: BuiltPackage;
}

/** 写字楼 + 闪烁窗 + 楼顶公司招牌（bob）+ 7 档涨跌箭头。代码专属皮肤范例。 */
function stockPackage(symbol: string, company: StockCompany, name: { en: string; zh: string }): BuiltPackage {
  const images = exportStock(company);
  const byPrefix = (p: string) => Object.keys(images).filter((k) => k.startsWith(p)).sort();
  const manifest = parseAssetManifest({
    format: 'mineo-skin@1', kind: 'asset', id: `stock-${symbol.toLowerCase()}`,
    name, version: '1.0.0', artGrid: 46, pixelated: true,
    layers: [
      { id: 'pavement', behavior: 'static', frames: ['pavement'], pos: [0, 1], anchor: [0.5, 0.5] },
      { id: 'tower', behavior: 'static', frames: ['tower'], pos: [0, 7], anchor: [0.5, 1] },
      { id: 'windows', behavior: 'static', frames: byPrefix('win_'), fps: 1.4, pos: [0, 7], anchor: [0.5, 1] },
      { id: 'logo', behavior: 'static', frames: ['logo'], pos: [0, -18], anchor: [0.5, 1], motion: 'bob' },
      { id: 'arrow', behavior: 'quote', clips: QUOTE_CLIPS, pos: [0, -28], anchor: [0.5, 0.5] },
    ],
  });
  return { id: `stock-${symbol.toLowerCase()}`, manifest, images };
}

/** 5 个示例股票占位皮肤（带代码，供 registry 按代码 scope）。 */
export function allStockPackages(): BuiltStockPackage[] {
  return [
    { symbol: 'AAPL', pkg: stockPackage('AAPL', 'apple', { en: 'Apple', zh: '苹果' }) },
    { symbol: 'NVDA', pkg: stockPackage('NVDA', 'nvidia', { en: 'Nvidia', zh: '英伟达' }) },
    { symbol: 'TSLA', pkg: stockPackage('TSLA', 'tesla', { en: 'Tesla', zh: '特斯拉' }) },
    { symbol: 'MSFT', pkg: stockPackage('MSFT', 'microsoft', { en: 'Microsoft', zh: '微软' }) },
    { symbol: 'AMZN', pkg: stockPackage('AMZN', 'amazon', { en: 'Amazon', zh: '亚马逊' }) },
  ];
}
