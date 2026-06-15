---
name: create-land-skin
description: How to author a new Mineo LAND+UI theme skin (the ground/scenery plus HUD color tokens, swapped via the main-screen palette button). Themes are now IMAGE PACKAGES — manifest.json (a few flat colors + UI tokens) + a fixed set of named PNG tiles/sprites (ideally AI-generated). A built-in interpreter lays them out (dynamic grid, fences, decor, drifting clouds). Use when adding/designing a new map theme for Mineo — e.g. a dusk variant, snowy field, neon city. Covers the package format, manifest fields, the 12 fixed image names, the AI-image workflow, and a checklist.
---

# 创建一个土地+UI 主题（Theme Skin · 图片包）

主题同时决定**地图场景**（会动的土地 + 全屏天空背景）与 **HUD 外观**（一组 UI 颜色 token）。用户在主界面左下 🎨 切换。

> **主题现在也是「图片包」。** 一个主题 = `manifest.json`（少量纯色 + UI token）+ 一组**固定命名的 PNG**（土壤/篱笆/树/池塘/花/云/鸟,**最好 AI 生成**）。内置解释器（`src/skins/runtime/interpretTheme.ts`）按通用布局把它们铺成土地+天空——**动态格子、篱笆、装饰摆位、云朵漂移全由解释器负责,作者不碰布局**。

## 0. 黄金法则

- **一个主题 = `public/skins/<id>/` 一个文件夹**：`manifest.json` + 固定命名的 PNG。
- 在 `public/skins/registry.json` 加一条 `kind:"theme"` 记录,即可被下载到本地。
- 范例:`public/skins/pastoral-day/`、`public/skins/pastoral-dusk/`（直接照抄改图改色）。

## 1. 包内必须的 12 张 PNG（固定命名）

解释器按这些**固定帧名**取图（见 `src/skins/format/manifest.ts` 的 `themeFrameNames`）:

| 文件 | 是什么 | 参考逻辑尺寸 |
|---|---|---|
| `soil_light.png` / `soil_dark.png` | 耕地棋盘两色土壤块（平铺） | 16×16 |
| `fence.png` | 篱笆立柱 | 6×16 |
| `tree_0.png` / `tree_1.png` | 装饰树 2 帧（轻摆） | 24×30 |
| `pond_0.png` / `pond_1.png` | 池塘 2 帧（波光） | 30×16 |
| `flower_0.png` / `flower_1.png` | 两种小花 | 7×11 |
| `cloud.png` | 土地层飘云 | 24×10 |
| `sky_cloud.png` | 天空背景云 | 28×11 |
| `bird.png` | 远飞小鸟 | 7×4 |

> 像素风按上面的小逻辑尺寸出图（解释器最近邻放大）;平滑/写实风可出更高分辨率,manifest 里设 `pixelated:false`。

## 2. manifest.json（纯色 + UI token）

大面积纯色填充（草地、泥径、天空渐变、太阳、远山）来自这里的 hex 颜色;有纹理的部分来自上面的 PNG。schema 见 `ThemeManifestSchema`。

```jsonc
{
  "format": "mineo-skin@1",
  "kind": "theme",
  "id": "snowy",
  "name": { "en": "Snowy", "zh": "雪原" },
  "version": "1.0.0",
  "tileSize": 104,                 // 单格世界像素
  "canvasBackground": "#cfe6f2",   // 画布兜底色（被全屏背景覆盖时基本不可见）
  "pixelated": true,               // 像素风=最近邻;平滑美术设 false
  "land": { "ground": "#dfeaf0", "groundShade": "#b9cdd8", "path": "#cdb79a" },
  "sky":  { "skyTop": "#eef7fc", "skyBottom": "#cfe6f2", "sun": "#fff1b8",
            "hill": "#dfeaf0", "hillDark": "#b9cdd8" },
  "ui":   { "skyTop": "#eef7fc", "skyBottom": "#cfe6f2", "panel": "#6f8aa6",
            "panelBorder": "#3c5066", "highlight": "#ffffff", "ink": "#2b3a47",
            "harvestText": "#4aa3ff" }
}
```

- `land`/`sky` 的颜色驱动:地基草地、泥径、天空分段渐变、像素太阳、远山。
- `ui`：HUD 颜色 token,写入 `:root` CSS 变量（见 `src/ui/applyTheme.ts`）。切主题时土地与 HUD **一起**变——务必协调。

## 3. AI 图片素材工作流

1. 用图片生成 API（fal.ai / MJ / SD）出上面 12 张 PNG:**透明底**,统一风格。
   - 土壤两色（亮/暗）要能**无缝平铺**;树/池塘出 2 帧做轻微动效。
2. 丢进 `public/skins/<id>/`,文件名**严格用上表的固定名**。
3. 照 `public/skins/pastoral-day/manifest.json` 写 manifest,改 `land`/`sky`/`ui` 配色 + tileSize。
4. 在 `public/skins/registry.json` 的 `skins` 加 `kind:"theme"` 一条;要做默认就加进 `defaults`。
5. `npm run dev` → 点左下 🎨 选你的主题（未装会自动下载到本地）→ 看土地/天空/HUD 同步切换。

## 4. 布局是解释器的事（你不用管）

- **动态格子**：格子数 `n` 随资产数量从 2×2 扩到 3×3、4×4…。解释器用你的 `soil_*`/`fence` 自动平铺/排布,镜头随 n 平滑缩放。你只提供图与色。
- **装饰/云**：树、池塘、花、云、鸟的位置与漂移都是解释器内置布局（与 pastoral 同布局）。
- **plot/相机**：解释器算好可种植区原点,引擎据此落资产。作者无需关心。

> 想要和田园**完全不同的布局**（不只是换色换图）？那超出当前主题格式,需要扩展解释器或新的主题模型——先和维护者确认。

## 5. 检查清单

- [ ] `public/skins/<id>/` 含 `manifest.json` + **全部 12 张固定命名 PNG**
- [ ] manifest 过 Zod 校验（照 pastoral-day 写;`parseThemeManifest` 不报错）
- [ ] `land`/`sky`/`ui` 配色协调,切主题时土地与 HUD 一起变好看
- [ ] `public/skins/registry.json` 加了 `kind:"theme"` 记录
- [ ] 土壤两色可无缝平铺;像素风设 `pixelated:true`
- [ ] `npm run dev`：🎨 切换正常,3×3/4×4 扩张时土地居中、镜头平滑
- [ ] `npm run typecheck` 与 `npm run build` 通过
