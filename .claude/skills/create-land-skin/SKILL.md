---
name: create-land-skin
description: Interactive, AI-image-driven flow to author a Mineo LAND+UI theme skin (the ground/scenery plus HUD color tokens, swapped via the main-screen 🎨 button). A theme = manifest.json (a few flat colors + UI tokens) + a fixed set of 12 named PNG tiles/sprites (ideally AI-generated). A built-in interpreter lays them out (dynamic grid, fences, decor, drifting clouds). Use when the user wants a new map theme — a dusk variant, snowy field, neon city. Walks the user from concept → image prompts + color scheme → live demo → iterate → final package. Covers the package format, the 12 fixed image names, manifest fields, and a checklist.
---

# 创建土地 + UI 主题（Theme Skin · AI 交互式流程）

主题同时决定**地图场景**（会动的土地 + 全屏天空背景）与 **HUD 外观**（一组 UI 颜色 token）。用户在主界面左下 🎨 切换。

> **主题是「图片包」**：`manifest.json`（少量纯色 + UI token）+ 一组**固定命名的 PNG**（土壤/篱笆/树/池塘/花/云/鸟，**AI 生成**）。解释器（`src/skins/runtime/interpretTheme.ts`）按通用布局铺成土地+天空——**动态格子、篱笆、装饰摆位、云朵漂移全由解释器负责，作者不碰布局**。

---

## 🧭 创作流程（严格按这 6 步，和用户来回确认）

### 步骤 1 · 拿到生图 API
- 同 `create-asset-skin`：有没有生图配置（gitignored 本地文件）；没有就**问用户** endpoint/key/调用格式（产出**透明底 PNG**）。**绝不提交 key**。

### 步骤 2 · 问用户要做什么主题
- 确认是**地图/土地**主题（不是资产 → 转 `create-asset-skin`）。
- 一句话主题（如「黄昏田园」「雪原」「霓虹都市」「江南水乡」）+ 整体色调。

### 步骤 3 · 问用户对各元素 / 配色的构想
主题的「元素」是固定的 12 张图 + 一套颜色，逐项问清：
- **12 张贴图**（见 §1）：土壤两色、篱笆、装饰树（2 帧轻摆）、池塘（2 帧波光）、两种小花、土地飘云、天空云、远飞小鸟——各长什么样、什么质感。
- **大面积纯色**（见 §2）：草地、泥径、天空渐变（top/bottom）、太阳、远山——给色调倾向。
- **HUD 配色**：面板/描边/高亮/文字/飘字色——要和土地协调（切主题时土地与 HUD **一起**变）。

### 步骤 4 · 拆成「生图 prompt + 配色方案」
- **12 条 image prompt**：每张一条，透明底，**统一画风**；土壤两色要能**无缝平铺**，树/池塘出 2 帧做轻动效。
- **配色方案 = manifest 里的 `land`/`sky`/`ui` 三组 hex**。把 12 张图清单 + 配色表列给用户确认，再去生图。
- （主题的「动画」是解释器内置的——云飘、树摆、水波；作者只给 2 帧即可，不用编排。）

### 步骤 5 · 生图 + 组装 + 演示 → 迭代到满意
- 生成 12 张 PNG（**严格用固定文件名**）→ 放进 `public/skins/<id>/`，照范例写 `manifest.json`（配色 + tileSize）。
- `registry.json` 加 `kind:"theme"` 一条，`npm run dev` → 左下 🎨 选它，**截图给用户看**（土地/天空/HUD 同步切换；加几个资产看 3×3/4×4 扩张）。
- **不满意 → 按指引回步骤 4/5**：改某张图的 prompt 重生、调某组配色，再演示。**循环到满意**。

### 步骤 6 · 定稿入库
- 确认 `public/skins/<id>/` 是最终 12 张 PNG + `manifest.json`。
- `registry.json` 记录（`kind:"theme"`）；要做默认主题加进 `defaults`。**改已发布主题要 bump `version`**（同步按版本号判断）。
- `npm run typecheck` + `npm run build` 过，commit。

---

## 📦 技术参考（执行第 4–6 步用）

### §1 · 必须的 12 张 PNG（固定命名）
解释器按这些**固定帧名**取图（见 `src/skins/format/manifest.ts` 的 `themeFrameNames`）：

| 文件 | 是什么 | 参考逻辑尺寸 |
|---|---|---|
| `soil_light.png` / `soil_dark.png` | 耕地棋盘两色土壤块（**无缝平铺**） | 16×16 |
| `fence.png` | 篱笆立柱 | 6×16 |
| `tree_0.png` / `tree_1.png` | 装饰树 2 帧（轻摆） | 24×30 |
| `pond_0.png` / `pond_1.png` | 池塘 2 帧（波光） | 30×16 |
| `flower_0.png` / `flower_1.png` | 两种小花 | 7×11 |
| `cloud.png` | 土地层飘云 | 24×10 |
| `sky_cloud.png` | 天空背景云 | 28×11 |
| `bird.png` | 远飞小鸟 | 7×4 |

> 像素风按上面小尺寸出图（解释器最近邻放大）；平滑/写实风可出更高分辨率，manifest 里设 `pixelated:false`。

### §2 · manifest.json（纯色 + UI token）
大面积纯色（草地/泥径/天空渐变/太阳/远山）来自这里的 hex；有纹理的部分来自上面的 PNG。schema 见 `ThemeManifestSchema`。照 `public/skins/pastoral-day/manifest.json` 改：
```jsonc
{
  "format": "mineo-skin@1", "kind": "theme", "id": "snowy",
  "name": { "en": "Snowy", "zh": "雪原" }, "version": "1.0.0",
  "tileSize": 104, "canvasBackground": "#cfe6f2", "pixelated": true,
  "land": { "ground": "#dfeaf0", "groundShade": "#b9cdd8", "path": "#cdb79a" },
  "sky":  { "skyTop": "#eef7fc", "skyBottom": "#cfe6f2", "sun": "#fff1b8",
            "hill": "#dfeaf0", "hillDark": "#b9cdd8" },
  "ui":   { "skyTop": "#eef7fc", "skyBottom": "#cfe6f2", "panel": "#6f8aa6",
            "panelBorder": "#3c5066", "highlight": "#ffffff", "ink": "#2b3a47",
            "harvestText": "#4aa3ff" }
}
```
- `land`/`sky` 驱动：地基草地、泥径、天空分段渐变、像素太阳、远山。
- `ui`：HUD 颜色 token，写入 `:root` CSS 变量（`src/ui/applyTheme.ts`）。切主题时土地与 HUD 一起变——务必协调。

### §3 · 布局是解释器的事（作者不碰）
- **动态格子**：`n` 随资产数从 2×2 扩到 3×3、4×4…，用 `soil_*`/`fence` 自动平铺，镜头随 n 平滑缩放。
- **装饰/云**：树/池塘/花/云/鸟的位置与漂移都是解释器内置（与 pastoral 同布局）。
- 想要和田园**完全不同的布局**（不只换色换图）超出当前格式，需扩展解释器或新主题模型——先和维护者确认。

### §4 · 范例
`public/skins/pastoral-day/`、`pastoral-dusk/`（直接照抄改图改色）。

### 检查清单
- [ ] `public/skins/<id>/` 含 `manifest.json` + **全部 12 张固定命名 PNG**
- [ ] manifest 过 Zod（`parseThemeManifest` 不报错）
- [ ] `land`/`sky`/`ui` 配色协调，切主题时土地与 HUD 一起变好看
- [ ] 土壤两色可无缝平铺；像素风设 `pixelated:true`
- [ ] `registry.json` 加了 `kind:"theme"` 记录；改已发布主题 **bump version**
- [ ] `npm run dev`：🎨 切换正常、3×3/4×4 扩张时土地居中镜头平滑；用户已确认满意
- [ ] `npm run typecheck` + `npm run build` 通过
