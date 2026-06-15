---
name: create-asset-skin
description: Interactive, AI-image-driven flow to author a Mineo ASSET skin (a "production mini-world" unit that sits on the map and animates). A skin = manifest.json + AI-generated PNG sprites, rendered by a built-in interpreter (no render code). Use when the user wants a new asset appearance — a farm, bank, villa, office, factory, or a stock-specific look. Walks the user from concept → image prompts → animation choreography → live demo → iterate → final package. Covers the package format, manifest schema, layer behaviors (static/plant/worker/idler/quote), motion recipes, per-category/per-symbol scope, the registry + version model, and a checklist.
---

# 创建资产皮肤（AI 交互式流程）

Mineo 的资产皮肤 = 一个**会生产 / 会反应的小世界**。皮肤是**图片包**：`manifest.json`（声明布局 + 行为）+ 一组 **AI 生成的 PNG**。内置解释器（`src/skins/runtime/interpretAsset.ts`）把它渲染成会动的单位——**不写任何渲染代码**；动效（摇摆/浮动/呼吸、丰收弹跳、分档提速、涨跌切档）由解释器程序化施加，所以 **AI 只需出「静图」**。

> **引擎边界（铁律）**：引擎只发抽象事件 `working1/2/3` + `harvest`、喂进度 `0..1`、按当日涨跌设 `PriceState`；并负责落位、入场淡入、相机缩放、画 `+X` 飘字、**资产名铭牌（脚下）** 与 **投资涨跌%（头顶上下跳）**。素材与编排全在包内的数据里——这些你都不用碰。

---

## 🧭 创作流程（严格按这 6 步，和用户来回确认，别跳步）

### 步骤 1 · 拿到生图 API
- 先看有没有生图配置（约定放在 gitignored 的本地文件，如根目录 `.imagegen.local.json`；先确认它在 `.gitignore` 里）。
- **没有就问用户**：生图 API 的 **endpoint、key、调用格式**（请求体字段、返回里图片 URL / base64 在哪个字段）。最好能产出**透明底 PNG**。
- 记下来（可缓存到上面那个 gitignored 文件，**绝不提交 key**）。本次会话用它来生图。

### 步骤 2 · 问用户要做什么皮肤
- 是**资产**皮肤还是**地图/土地**皮肤？（地图 → 转 `create-land-skin` 技能。）
- 哪种资产？**现金流 / 存款 / 房产 / 投资**，或通用 → 决定 `scope`（见技术参考 §scope）。
  - 投资还要问：做**通用投资默认**（所有代码可选，如办公室/工厂），还是**某代码专属**（如 AAPL，`scope.symbols`）。
- 一句话主题（如「赛博朋克矿场」「苹果公司总部」「江南水乡别墅」）。

### 步骤 3 · 问用户对「各元素 / 各状态」的构想
按类型引导用户逐个描述**元素**及其**状态/动作**：
- **产出型（现金流 / 存款 / 房产）**——有进度条 + 金币：
  - 场地/地坪（**铺满格子**）、产物（可随成熟度做多帧）、1–2 个工人（`idle` + 丰收两态）、**强烈建议一个偷懒者**（`sit`/`work`，这是「小世界」的灵魂）、点缀道具、头顶进度条。
- **投资型**——无进度条/金币，头顶有涨跌%：
  - 建筑主体、招牌/logo、动态点缀（闪烁窗 / 烟囱烟 / 旋转齿轮 / 楼顶信标…）、（可选）随 7 档涨跌变化的视觉（`quote` 行为）。
- 逐元素记下：长什么样、什么画风、做什么动作、有没有多个状态。

### 步骤 4 · 拆成「生图 prompt + 动画编排」
- **一组 image prompt**：每个元素（或每帧）一张，透明底，**统一画风 + 统一分辨率**。把每条 prompt 写清楚给用户看。
- **动画编排 = manifest**：每个元素 → 一个 `layer`，选 `behavior` + `motion` + 位置/锚点 + `frames`/`clips`（见 §层、§动作）。AI 只出静图，动效解释器加。
- 列一张「prompt ↔ 层/帧名」对应表给用户确认，再去生图。

### 步骤 5 · 生图 + 编排 + 演示 → 迭代到满意
- 用步骤 1 的 API 生成所有 PNG → 放进 `public/skins/<id>/`。
- 写 `manifest.json`，在 `registry.json` 加一条，起 `npm run dev`，加一个该类资产、选这个皮肤，**截图给用户看动起来的演示**。
- **用户不满意 → 按他的指引回步骤 4/5**：改某元素的 prompt 重生那张图、改某层的 behavior/motion/位置、加减帧……只重做要改的部分，再演示。**循环直到用户满意**。

### 步骤 6 · 定稿入库
- 确认 `public/skins/<id>/` 是最终 PNG + `manifest.json`。
- `registry.json` 记录：`id` / `name` / `version` / `base` / `scope`；要做默认皮肤再加进 `defaults`。
- **改了已发布皮肤必须 bump `version`**——否则老用户设备不会重新下载（同步按版本号判断，见 `src/skins/store/download.ts` 的 `syncWithRegistry`）。
- `npm run typecheck` + `npm run build` 过，commit。

---

## 📦 技术参考（执行第 4–6 步用）

### 包结构
```
public/skins/<id>/
  manifest.json        # 声明：分层、行为、动作、事件编排、进度条
  grass.png            # 各帧 PNG（帧名 = 文件名去掉 .png）
  tree0_0.png  tree0_1.png
  picker0_idle_0.png ... picker0_harvest_0.png ...
```
manifest schema 见 `src/skins/format/manifest.ts`（`AssetManifestSchema`）。最小骨架：
```jsonc
{
  "format": "mineo-skin@1",
  "kind": "asset",
  "id": "mine",
  "name": { "en": "Mine", "zh": "矿井" },
  "version": "1.0.0",
  "artGrid": 46,            // 每个 tile = 多少逻辑像素（与图素分辨率一致，颗粒统一）
  "pixelated": true,        // 像素风=最近邻；AI 平滑/写实美术设 false
  "layers": [ /* 见 §层 */ ],
  "progressBar": { "pos": [0, -0.44], "width": 0.6 }  // 产出型才要；投资型不要
}
```

### 层 layers —— 作者只需「给图 + 选 behavior」
| behavior | 含义 | 典型 |
|---|---|---|
| `static` | 纯展示；可加环境动作；可选 `popOnHarvest` | 地坪、果筐、招牌 |
| `plant`  | 作物/树：环境动作 + 丰收弹跳 | 果树、麦子 |
| `worker` | 工人：循环 `idle`，工作档位越高播得越快；丰收播一次 `harvest` 再回 `idle` | 采摘工、柜员、园丁 |
| `idler`  | 偷懒者：低档位播 `sit`，到 `workAt` 档位切 `work`——**产出型强烈建议留一个** | 偷懒的 |
| `quote`  | **投资专用**：按当日涨跌切 7 档片段（clips 键用 `up3/up2/up1/plain/down1/down2/down3`） | 涨跌箭头 |

层字段示例：
```jsonc
{ "id": "tree0", "behavior": "plant",
  "frames": ["tree0_0", "tree0_1"],   // 简单循环帧（单帧=静图）。与 clips 二选一
  "pos": [-13, 5],                     // artGrid 单位, (0,0)=单位中心
  "anchor": [0.5, 1],                  // 默认 [0.5,1] 底部居中
  "fps": 1.2, "motion": "sway", "popOnHarvest": true }

{ "id": "picker0", "behavior": "worker",
  "clips": { "idle": ["picker0_idle_0","picker0_idle_1"],
             "harvest": ["picker0_harvest_0","picker0_harvest_1"] },
  "pos": [-9, 13], "fps": 4 }

{ "id": "lazy", "behavior": "idler",
  "clips": { "sit": ["lazy_sit_0","lazy_sit_1"], "work": ["lazy_work_0","lazy_work_1"] },
  "pos": [15, 13], "fps": 1.5, "workAt": 3 }

{ "id": "arrow", "behavior": "quote",   // 投资：7 档涨跌
  "clips": { "up3":["up3"],"up2":["up2"],"up1":["up1"],"plain":["plain"],
             "down1":["down1"],"down2":["down2"],"down3":["down3"] },
  "pos": [0, -28] }
```

### 动作由解释器加 —— AI 只出静图
- **环境动作** `motion: "sway"|"bob"|"breathe"`：把静图做成摇摆/上下浮/呼吸。一张树静图 + `sway` = 会摆的树，**不必逐帧**。⚠️ 同一层别同时给 `motion` 和 `popOnHarvest`（都改 scale，会打架）——呼吸的楼别再丰收弹跳。
- **丰收弹跳** `popOnHarvest: true`：丰收时该层 squash & stretch 弹一下。
- **分档提速**：`worker` 随 working1<2<3 自动加快。
- **涨跌切档**：`quote` 层随当日涨跌切 7 档片段（引擎喂 `PriceState`）。
- **逐帧动画（可选）**：真要逐帧就给多帧 `frames`/`clips`；否则一张静图 + 动作配方足矣。AI 最不擅长逐帧一致性，主力做法是 **AI 出好看的静图 + 选 behavior/motion**。

### scope —— 按类别 / 代码限定（投资必看）
`registry.json` 每条可带 `scope`：
- 无 `scope` = 通用（所有类别可选）。
- `"scope": { "kinds": ["deposit"] }` = 该类别专属（现金流→cashflow / 存款→deposit / 房产→realestate / 投资→investment）。
- `"scope": { "symbols": ["AAPL"] }` = **投资专属代码皮肤**，仅该代码的投资可选。
SkinPicker 按当前资产（类别 + 代码）过滤；逻辑见 `skinAppliesTo()`。

### 坐标与进度条
- `pos`：artGrid 逻辑像素单位，`(0,0)` = 单位中心，`anchor` 默认底部居中。
- `progressBar.pos`：tile 占比（`[0,-0.44]` 在头顶上方）；`width`：tile 占比（`0.6`）。**投资型不要 progressBar**（引擎自动隐藏进度条、改画涨跌%）。

### 让皮肤「填满格子」（重要美感经验）
- 地坪/场地图要**铺满格子**（参考 `~44×26` 的 footprint，pos 居中），别只画一条细缝——否则建筑像飘在空地上。
- 主体也别太窄；元素在格子里铺开（像农场把工人/作物散布），整格才不空。

### 范例（照抄改）
- **产出型**：`public/skins/orchard/`（果园：草地+3 果树+2 采摘工+偷懒者+果筐+进度条）、`wheat-farm/`、`bank/`（银行：门面呼吸+旋转金币+闪烁招牌+柜员）、`villa/`（别墅：屋宇+摇摆树+烟囱烟+泳池波光+园丁）。
- **投资型**：`office/`（写字楼+闪烁窗+楼顶信标+涨跌箭头）、`factory/`（厂房+齿轮+双烟囱）、`stock-aapl/`（写字楼+楼顶苹果招牌，代码专属）。
- 这些是用 `src/skins/_export/`（dev 期程序化渲染 → PNG）导出的范例；**新 AI 皮肤跳过这步**——本来就是 PNG。导出器/manifest 见 `src/skins/_export/packages.ts` + `buildings.ts`。

### 检查清单
- [ ] `public/skins/<id>/` 含 `manifest.json` + 全部 PNG（帧名 = 文件名）
- [ ] manifest 过 Zod（照范例写；`parseAssetManifest` 不报错）
- [ ] 产出型：≥1 个 `idler`、`worker` 有 `idle`+`harvest`、有 `progressBar`；投资型：有 `quote` 层、无 progressBar
- [ ] 地坪铺满格子、主体不过窄
- [ ] `registry.json` 加了记录（含合适的 `scope`）；改已发布皮肤 **bump version**
- [ ] `npm run dev` 演示：皮肤出现在「外观」、可下载、动画正常；用户已确认满意
- [ ] `npm run typecheck` + `npm run build` 通过
