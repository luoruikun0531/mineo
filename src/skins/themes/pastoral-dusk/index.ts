import type { ThemeSkin } from '../../types';
import {
  buildPixelFarmLand,
  buildPixelSkyBackdrop,
  type LandPalette,
} from '../../kit';

/**
 * 土地+UI 皮肤：田园·黄昏。
 * 自包含：色板 + UI token + 清单。复用 kit 的通用田园土地构建器。
 */
const palette: LandPalette = {
  grass: 0x8f9d6b,
  grassDark: 0x77885a,
  ground: 0x9aa073,
  groundShade: 0x6f7a4f,
  path: 0xb98c63,
  plotLight: 0xa07650,
  plotDark: 0x82603d,
  furrow: 0x5e4128,
  fence: 0xd9b48a,
  fenceShade: 0x916a44,
  trunk: 0x6f4a2c,
  leaf: 0x5f8a52,
  leafDark: 0x466239,
  flowerA: 0xe487b4,
  flowerB: 0xf2b35e,
  flowerCore: 0xffe7bd,
  water: 0x5f93c2,
  waterLight: 0x93bfe0,
  cloud: 0xf3d9bf,
  sunGlow: 0xffd59a,
};

const pastoralDusk: ThemeSkin = {
  id: 'pastoral-dusk',
  name: { en: 'Pastoral · Dusk', zh: '田园 · 黄昏' },
  tileSize: 104,
  canvasBackground: 0xe89a73,
  buildLand: (grid) => buildPixelFarmLand(grid, palette),
  buildBackdrop: (w, h) =>
    buildPixelSkyBackdrop(w, h, {
      skyTop: 0xffd9a0,
      skyBottom: 0xe89a73,
      cloud: palette.cloud,
      sun: palette.sunGlow,
      hill: palette.grass,
      hillDark: palette.grassDark,
    }),
  ui: {
    skyTop: '#ffd9a0',
    skyBottom: '#e89a73',
    panel: '#a96a3f',
    panelBorder: '#5e3620',
    highlight: '#ffe9cf',
    ink: '#3a271b',
    harvestText: '#ff9a3c',
  },
};

export default pastoralDusk;
