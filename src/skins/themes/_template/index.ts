/**
 * 模板：土地 + UI 皮肤。复制本文件夹、改名为你的皮肤 id，按需修改即可。
 * 规则：只 import `../../types` 与 `../../kit`，绝不 import 其它皮肤文件夹。
 * 以 `_` 开头的文件夹会被加载器忽略，所以本模板不会被注册。
 *
 * 一个土地皮肤文件夹至少包含：
 *   index.ts        默认导出一个 ThemeSkin（清单 + buildLand + ui）
 * 可选：自己的 palette.ts / 自定义 buildLand / 美术素材等（都放在本文件夹内）。
 */
import type { ThemeSkin } from '../../types';
import { buildPixelFarmLand, type LandPalette } from '../../kit';

// 方式 A：复用 kit 的通用【像素】田园土地，只换色板（buildFarmLand 是矢量版，如需平滑风可换）：
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

// 方式 B（完全自定义土地）：不使用 buildFarmLand，自己实现
//   buildLand: (grid) => { const view = new Container(); ...; return { view, size, plot, update, destroy }; }
//   只要返回的 SceneHandle 含 size 与 plot（可种植区原点+格尺寸）即可。

const template: ThemeSkin = {
  id: 'template-theme', // ← 改成唯一 id（建议与文件夹名一致）
  name: { en: 'Template', zh: '模板' },
  tileSize: 104, // 单格世界像素，越大越能容纳资产细节
  canvasBackground: 0xffd28a,
  buildLand: (grid) => buildPixelFarmLand(grid, palette),
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

export default template;
