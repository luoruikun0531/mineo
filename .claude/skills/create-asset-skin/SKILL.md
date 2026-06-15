---
name: create-asset-skin
description: How to author a new Mineo ASSET skin (a "production mini-world" unit that sits on the map and animates). Asset skins are now IMAGE PACKAGES — manifest.json + PNG sprites (ideally AI-generated), rendered by a built-in interpreter (no code). Use when adding/designing a new asset appearance for Mineo — e.g. a farm, orchard, mine, workshop, fishery. Covers the package format, the manifest schema, layer behaviors, motion recipes, the AI-image workflow, the registry/local-store model, and a checklist.
---

# 创建一个资产皮肤（Asset Skin · 图片包）

Mineo 的资产是一个**会生产的小世界**：场地 + 产物 + 多个有行为的角色（建议留一个偷懒的）+ 道具。

> **皮肤现在是「图片包」，不是代码。** 一个皮肤 = `manifest.json`（声明布局 + 行为）+ 一组 PNG 贴图（**最好用 AI 生成**）。一个内置的**解释器**（`src/skins/runtime/interpretAsset.ts`）把包渲染成会动的单位——**作者不写任何渲染代码**。动效（摇摆/浮动/呼吸/丰收弹跳、分档提速、丰收编排）由解释器程序化施加,所以 **AI 只需要出"静图"**。

## 0. 黄金法则

- **一个皮肤 = `public/skins/<id>/` 一个文件夹**：`manifest.json` + 若干 `*.png`。
- 在 `public/skins/registry.json` 加一条记录,皮肤即可被「皮肤商店」按需下载到用户本地（IndexedDB）。运行时只从本地库读、解释、渲染。
- 皮肤与**资产类型无关**：现金流/投资只决定录入项与收益算法,**不**决定外观。
- **主程序边界（铁律没变）**：引擎只发抽象事件 `working1/2/3` + `harvest`、喂收成进度 `0..1`、给时钟;素材与编排全在包内的数据里。引擎负责落位、入场淡入、相机缩放、画 `+X` 飘字与资产名铭牌——你都不用管。

## 1. 包结构

```
public/skins/<id>/
  manifest.json        # 声明：分层、行为、动作、事件编排、进度条
  grass.png            # 各帧 PNG（帧名 = 文件名去掉 .png）
  tree0_0.png  tree0_1.png
  picker0_idle_0.png ... picker0_harvest_0.png ...
  ...
```

`manifest.json` 的 schema 见 `src/skins/format/manifest.ts`（`AssetManifestSchema`）。最小骨架:

```jsonc
{
  "format": "mineo-skin@1",
  "kind": "asset",
  "id": "mine",
  "name": { "en": "Mine", "zh": "矿井" },
  "version": "1.0.0",
  "artGrid": 46,            // 每个 tile = 多少逻辑像素（与图素分辨率一致，颗粒统一）
  "pixelated": true,        // 像素风=最近邻;AI 平滑/写实美术设 false
  "layers": [ /* 见 §2 */ ],
  "progressBar": { "pos": [0, -0.44], "width": 0.6 }  // pos=tile 占比, width=tile 占比
}
```

## 2. 层（layers）—— 作者只需「给图 + 选 behavior」

每层引用一张或几张 PNG,选一个 `behavior`,解释器据此响应 4 个事件:

| behavior | 含义 | 典型 |
|---|---|---|
| `static` | 纯展示;可加环境动作;可选 `popOnHarvest` | 草地、果筐 |
| `plant`  | 作物/树:环境动作 + 丰收弹跳 | 果树、麦子 |
| `worker` | 工人:循环 `idle` 片段,工作档位越高播得越快;丰收播一次 `harvest` 片段再回 `idle` | 采摘工、锄地工 |
| `idler`  | 偷懒者:低档位播 `sit`,到 `workAt` 档位切 `work`——**强烈建议留一个,这是"小世界"的灵魂** | 偷懒的 |

层字段:
```jsonc
{ "id": "tree0", "behavior": "plant",
  "frames": ["tree0_0", "tree0_1"],   // 简单循环帧（单帧=静图）。与 clips 二选一
  "pos": [-13, 5],                     // artGrid 单位, (0,0)=单位中心
  "anchor": [0.5, 1],                  // 默认 [0.5,1] 底部居中
  "fps": 1.2,
  "motion": "none",                    // none|sway|bob|breathe（叠加循环动效）
  "popOnHarvest": true }

{ "id": "picker0", "behavior": "worker",
  "clips": { "idle": ["picker0_idle_0","picker0_idle_1"],   // 命名片段
             "harvest": ["picker0_harvest_0","picker0_harvest_1"] },
  "pos": [-9, 13], "fps": 4 }

{ "id": "lazy", "behavior": "idler",
  "clips": { "sit": ["lazy_sit_0","lazy_sit_1"], "work": ["lazy_work_0","lazy_work_1"] },
  "pos": [15, 13], "fps": 1.5, "workAt": 3 }
```

## 3. 动作由引擎加 —— AI 只出静图

- **环境动作**：`motion: "sway"|"bob"|"breathe"` 把静图做成摇摆/上下浮/呼吸。一张树的静图 + `sway` = 会摆的树,**不必逐帧**。
- **丰收弹跳**：`popOnHarvest: true`,丰收时该层 squash&stretch 弹一下。
- **分档提速**：`worker` 层随 working1<2<3 自动加快。
- **逐帧动画（可选）**：真想要逐帧（出了 sprite sheet）就给 `frames`/`clips` 多帧;否则一张静图 + 动作配方足矣。

> AI 最不擅长逐帧一致性。所以主力做法是 **AI 出好看的静图 + 选 behavior/motion**。

## 4. AI 图片素材工作流（推荐）

1. 用图片生成 API（如 **fal.ai** / Midjourney / SD）出 PNG:**透明底**,像素风或写实皆可。
   - 每个元素一张静图（一棵树、一个工人 idle、一个工人 harvest、一个筐）。
   - 要逐帧就出几帧一组（一个 clip）。
2. 把 PNG 丢进 `public/skins/<id>/`,文件名即帧名。
3. 照着 `public/skins/orchard/manifest.json` 写 `manifest.json`,调位置/behavior。
4. 在 `public/skins/registry.json` 的 `skins` 加一条;要做默认皮肤再加进 `defaults`。
5. `npm run dev` → 右下「＋添加资产」→「外观」里你的皮肤会出现;未装的点下载按钮装到本地 → 选中 → 看效果。

**对齐技巧**：AI 出图不会像素级对齐,用每层的 `anchor`/`pos`/（必要时缩放）微调。任意分辨率都行,解释器按 `artGrid` 缩放到 tile;像素风设 `pixelated:true`(最近邻),平滑美术设 `false`(线性)。

## 5. 坐标与进度条

- `pos`：artGrid 逻辑像素单位,`(0,0)` = 单位中心,`anchor` 默认底部居中。
- `progressBar.pos`：tile 占比（如 `[0,-0.44]` 在头顶上方）;`width`：tile 占比（如 `0.6`）。引擎每帧喂进度,解释器自动填充——你只声明位置/宽度。

## 6. 老皮肤是范例（也是如何把程序化转 PNG 的来源）

- `public/skins/orchard/`：多层范例（草地 + 3 棵果树 + 2 采摘工 + 偷懒者 + 2 果筐 + 进度条）。
- `public/skins/wheat-farm/`：耕地 + 一排麦子 + 锄地工 + 偷懒者 + 粮袋。
- 这两个是从早期"程序化皮肤"用 `src/skins/_export/`（dev 期渲染贴图 → PNG）导出的。**新 AI 皮肤跳过这步**——本来就是 PNG。导出器与范例 manifest 见 `src/skins/_export/packages.ts`。

## 7. 检查清单

- [ ] `public/skins/<id>/` 含 `manifest.json` + 全部 PNG（帧名 = 文件名）
- [ ] manifest 过 Zod 校验（照 orchard 的形状写;`parseAssetManifest` 不报错）
- [ ] `public/skins/registry.json` 加了该皮肤记录
- [ ] 至少 1 个 `idler`(偷懒的);`worker` 层有 `idle` + `harvest` 片段
- [ ] 有 `progressBar`
- [ ] `npm run dev`：皮肤出现在「外观」商店,可下载、可选、动画正常（4 段 + 丰收弹跳）
- [ ] `npm run typecheck` 与 `npm run build` 通过
