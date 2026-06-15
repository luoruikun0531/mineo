import type { ThemeSkin } from '../../types';
import {
  buildPixelFarmLand,
  buildPixelSkyBackdrop,
  type LandPalette,
} from '../../kit';

/**
 * 土地+UI 皮肤：田园·白昼。
 * 自包含：色板 + UI token + 清单。复用 kit 的通用田园土地构建器。
 */
const palette: LandPalette = {
  grass: 0xa8c66c,
  grassDark: 0x8fb85a,
  ground: 0xb6d07a,
  groundShade: 0x88a64f,
  path: 0xc9a06b,
  plotLight: 0xb98a5a,
  plotDark: 0x9e7144,
  furrow: 0x7a5532,
  fence: 0xe6c79a,
  fenceShade: 0xa9824f,
  trunk: 0x8a5a34,
  leaf: 0x6fae4f,
  leafDark: 0x568a3c,
  flowerA: 0xff9ec2,
  flowerB: 0xffd24a,
  flowerCore: 0xfff2c0,
  water: 0x6fc6d6,
  waterLight: 0xa7e4ee,
  cloud: 0xfff6e6,
  sunGlow: 0xfff1b8,
};

const pastoralDay: ThemeSkin = {
  id: 'pastoral-day',
  name: { en: 'Pastoral · Day', zh: '田园 · 白昼' },
  tileSize: 104,
  canvasBackground: 0xffd28a,
  buildLand: (grid) => buildPixelFarmLand(grid, palette),
  buildBackdrop: (w, h) =>
    buildPixelSkyBackdrop(w, h, {
      skyTop: 0xffe9b8,
      skyBottom: 0xffd28a,
      cloud: palette.cloud,
      sun: palette.sunGlow,
      hill: palette.grass,
      hillDark: palette.grassDark,
    }),
  ui: {
    skyTop: '#ffe9b8',
    skyBottom: '#ffd28a',
    panel: '#c98a4b',
    panelBorder: '#7a4e25',
    highlight: '#fff6d8',
    ink: '#4a3526',
    harvestText: '#ffb300',
  },
};

export default pastoralDay;
