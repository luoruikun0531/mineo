---
name: create-land-skin
description: How to author a new Mineo LAND+UI theme skin (the animated ground/scenery plus the HUD color tokens, swapped via the main-screen palette button). Use when adding/designing a new map theme for the Mineo project — e.g. a dusk variant, a snowy field, a neon city. Covers the isolated-folder plugin structure, the ThemeSkin contract, the kit land builder, dynamic-grid/camera rules, and a checklist.
---

# 创建一个土地+UI 皮肤（Theme Skin）

土地皮肤同时决定**地图场景**（会动的土地/装饰）与**HUD 外观**（一组 UI 颜色 token）。用户在主界面左下 🎨 按钮切换/替换。

## 0. 黄金法则：皮肤即插件，完全隔离

- **一个文件夹 = 一个皮肤**，放进 `src/skins/themes/<your-id>/` 即被自动发现注册（`src/skins/loader.ts`，无需改中心文件）。
- 只可 `import` `../../types` 与 `../../kit`；**绝不**跨皮肤 import。
- `_` 开头的文件夹被加载器忽略（如 `_template`）。

## 1. 起步：复制模板

```
cp -r src/skins/themes/_template src/skins/themes/<your-id>
```
文件夹名建议 = 皮肤 `id`（如 `pastoral-day`、`snowy`）。

## 2. 必需内容

`index.ts` **默认导出**一个 `ThemeSkin`：

```ts
import type { ThemeSkin } from '../../types';
import {
  buildPixelFarmLand,
  buildPixelSkyBackdrop,
  type LandPalette,
} from '../../kit';

const palette: LandPalette = { /* 20 个颜色，见 _template / kit/landParts.ts */ };

const snowy: ThemeSkin = {
  id: 'snowy',                          // 唯一，建议同文件夹名
  name: { en: 'Snowy', zh: '雪原' },    // 必须含 en 与 zh
  tileSize: 104,                        // 单格世界像素（越大越能容纳资产细节）
  canvasBackground: 0xcfe6f2,           // 画布兜底色（被全屏背景覆盖时基本不可见）
  buildLand: (grid) => buildPixelFarmLand(grid, palette), // 像素土地（buildFarmLand=矢量版）
  buildBackdrop: (w, h) =>              // 全屏皮肤背景：让"整个页面都是皮肤"（见 §4b）
    buildPixelSkyBackdrop(w, h, {
      skyTop: 0xe8f4fb, skyBottom: 0xcfe6f2,
      cloud: palette.cloud, sun: palette.sunGlow,
      hill: palette.grass, hillDark: palette.grassDark,
    }),
  ui: {                                 // HUD 外观 token（写入 CSS 变量）
    skyTop: '#e8f4fb', skyBottom: '#cfe6f2',
    panel: '#6f8aa6', panelBorder: '#3c5066',
    highlight: '#ffffff', ink: '#2b3a47', harvestText: '#4aa3ff',
  },
};
export default snowy;
```

## 3. 两种实现土地的方式

- **方式 A（推荐起步）**：复用 kit 的通用田园土地，只调 `LandPalette` 配色即可得到一块会动的土地（地基 + 耕地棋盘 + 篱笆 + 树/花/池塘/云/阳光）。两个版本：`buildPixelFarmLand`（**像素，默认**）/ `buildFarmLand`（矢量平滑）。
- **方式 B（完全自定义）**：自己实现 `buildLand(grid)`，返回 `SceneHandle`：
  ```ts
  buildLand: (grid) => {
    const view = new Container();
    // ...自定义绘制；用 grid.cols/rows/tileSize...
    return {
      view,
      size: { width, height },                 // 必填：用于居中
      plot: { x, y, tileSize: grid.tileSize },  // 必填：可种植区原点（资产落位）
      update: (dt) => { /* 动画 */ },
      destroy: () => view.destroy({ children: true }),
    };
  }
  ```
  `plot` 必须正确——引擎按它把资产单位放到每个格子中心。

## 4. 必须适配"动态格子 + 镜头"

- 格子数 `n` 是**动态**的：2×2 起步，资产塞满即扩张（3×3、4×4…）。`buildLand(grid)` 会被以不同 `grid.cols = grid.rows = n` 多次调用——**不要写死格子数**，一律用传入的 `grid`。
- 引擎负责：扩张时的土地交叉淡入、镜头随 n 平滑缩放（n 小→视野低/格子大；n 大→视野拉高）。皮肤无需关心相机；只要 `size` 与 `plot` 正确即可。

## 4b. 全屏皮肤背景 `buildBackdrop`（推荐：整页都是皮肤）

可选的 `buildBackdrop(width, height) → SceneHandle`：在**屏幕空间**铺满整个视野的背景（土地在它之上居中），让四周不留白、"整个页面都是皮肤"。引擎在挂载 / 切主题 / 改窗口尺寸时重建它，并每帧调用其 `update(dt)`。

- 最快：用 kit 的 `buildPixelSkyBackdrop(w, h, { skyTop, skyBottom, cloud, sun, hill, hillDark })`（像素天空渐变 + 漂移云 + 太阳 + 远山 + 小鸟）。
- 也可自实现：返回 `{ view, update(dt), destroy() }`，`view` 覆盖 `(0,0)..(w,h)` 整个视野。
- 不实现也行（回退到 `canvasBackground` 纯色），但四周会显空。

## 5. UI token（`ui`）

写入 `:root` CSS 变量（见 `src/ui/applyTheme.ts`），驱动 HUD（顶部收成、按钮、面板）外观。务必与土地配色协调；切换皮肤时土地与 HUD 会**一起**变。

字段：`skyTop, skyBottom, panel, panelBorder, highlight, ink, harvestText`（可选 `fontFamily`）。

## 6. 自测

1. `npm run typecheck` 通过。
2. `npm run dev`，点左下 🎨 选你的新皮肤，确认土地、全屏背景、HUD 同步切换、动画正常。
3. 反复 ＋添加资产 触发 3×3/4×4，确认你的土地在不同 `n` 下都正确居中、`plot` 对齐格子、镜头平滑。

## 7. 检查清单

- [ ] 文件夹在 `src/skins/themes/<id>/`，`index.ts` 默认导出 `ThemeSkin`
- [ ] `id` 唯一；`name` 含 `en` 与 `zh`
- [ ] `buildLand(grid)` 用传入 grid，不写死格子数；返回 `size` 与 `plot`
- [ ] （推荐）实现 `buildBackdrop`，全屏背景与土地/UI 配色协调
- [ ] `canvasBackground` 与 `ui` 配色协调
- [ ] 只 import `../../types` 与 `../../kit`，无跨皮肤 import
- [ ] `typecheck` 通过；🎨 切换、3×3 扩张、镜头缩放均实测 OK
```
