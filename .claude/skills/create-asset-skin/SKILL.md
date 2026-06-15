---
name: create-asset-skin
description: How to author a new Mineo ASSET skin (a "production mini-world" unit that sits on the map and animates). Use when adding/designing a new asset appearance for the Mineo project — e.g. a farm, orchard, mine, workshop, fishery. Covers the isolated-folder plugin structure, the AssetSkin contract, the kit SDK, animation/layering conventions, and a checklist.
---

# 创建一个资产皮肤（Asset Skin）

Mineo 的资产是一个**会生产的小世界**：场地 + 产物 + 多个有行为的角色（建议留一个偷懒的）+ 道具 + 特效。**细节就是产品**——默认可糙，但必须分层、可继续做细。

## 0. 黄金法则：皮肤即插件，完全隔离

- **一个文件夹 = 一个皮肤**，放进 `src/skins/assets/<your-id>/` 即被自动发现注册（`src/skins/loader.ts` 用 `import.meta.glob` 扫描，无需改任何中心文件）。
- 皮肤文件夹**只可** `import` 平台契约 `../../types` 与平台 SDK `../../kit`；**绝不可** import 其它皮肤文件夹。皮肤之间零耦合。
- 皮肤与**资产类型无关**：现金流/投资只决定录入项与收益算法，**不**决定外观。同一皮肤可用于任意类型。
- **主程序边界（铁律）**：主程序只通过三条通道跟你沟通——`onEvent(event, phaseSec)`（抽象事件）、`update(dt)`（时钟）、`setProgress(p)`（当前收成进度 0..1）；只知道"现在什么状态"。**素材、编排、是否用 GSAP、像素还是日漫，全封装在皮肤内部，主程序与 GSAP 互不感知**。引擎只负责：把 `view` 摆到地图上 + 中性过渡（位置/alpha）、在单位上方画 `+X` 飘字、在下方画资产名铭牌——这些你都不用管，view 内部由你全权决定。

## 1. 起步：复制模板

```
cp -r src/skins/assets/_template src/skins/assets/<your-id>
```
- 文件夹名建议 = 皮肤 `id`（小写连字符，如 `wheat-farm`、`mine`）。
- `_` 开头的文件夹会被加载器忽略（模板因此不会被注册）。

## 2. 必需内容

文件夹至少包含 `index.ts`，**默认导出**一个 `AssetSkin`：

```ts
import { Container, Graphics } from 'pixi.js';
import type { AssetSkin, AssetSkinHandle } from '../../types';
import { makeCharacter, makeProgressBar } from '../../kit';

const mine: AssetSkin = {
  id: 'mine',                       // 唯一，建议同文件夹名
  name: { en: 'Mine', zh: '矿井' }, // 必须含 en 与 zh
  build: ({ tileSize }): AssetSkinHandle => {
    const s = tileSize / 104;       // 以 104 为基准缩放
    const view = new Container();
    // ...绘制场景（见 §3 §4）...

    // 头顶进度条（成熟度）—— 皮肤的一部分
    const bar = makeProgressBar(tileSize * 0.6);
    bar.view.position.set(0, -tileSize * 0.42);
    view.addChild(bar.view);

    let elapsed = 0;
    return {
      view,
      setProgress: (p) => bar.set(p),          // 引擎每帧喂进度 0..1
      update: (dt) => { elapsed += dt; /* 推进常驻动画 */ },
      onEvent: (event, phaseSec) => {
        // working1/2/3：4 段工作强度（用 phaseSec 自适应节奏）；harvest：丰收一次
        if (event === 'harvest') { /* 闪光/欢呼/产物弹出 */ }
        else { /* 切到 working1/2/3 对应的忙碌程度 */ }
      },
      destroy: () => view.destroy({ children: true }),
    };
  },
};
export default mine;
```

把私有部件拆到同文件夹的其它文件（如 `parts.ts`、`crops.ts`），保持 `index.ts` 清爽。

## 3. `build({ tileSize })` 约定

- **坐标系**：以 `(0,0)` 为**格子中心**绘制，整体大致落在 `[-tileSize/2, tileSize/2]`。引擎会把单位放到格子中心。
- **不要**自己处理位置/入场/资产名——引擎（`engine/board.ts`）负责落位、随格子重排、入场淡入、随相机缩放，并在单位下方画资产名铭牌、上方弹 `+X`。
- 返回 `AssetSkinHandle`：
  - `view: Container`（必需）
  - `update(dt)`：每帧推进常驻动画（dt 秒，已限幅）
  - `setProgress(p)`：引擎每帧告知当前收成进度 0..1 —— 用来更新头顶进度条（见 §4）
  - `onEvent(event, phaseSec)`：主程序发抽象事件（见下表），`phaseSec`=该阶段动态时长
  - `destroy()`：清理（`view.destroy({ children: true })`）

### 4 个抽象事件（引擎按收成进度发）

| 事件 | 触发 | 皮肤该做什么 |
|---|---|---|
| `working1` | 进度 < 25% | 轻松开工 |
| `working2` | 进度 < 50% | 忙起来 |
| `working3` | 进度 < 75%（含到满前） | 冲刺、最忙（可让偷懒的也起来干） |
| `harvest` | 进度满 | 丰收一次：欢呼 + 产物弹/闪 |

`phaseSec` = 这一阶段会持续多少秒（随收成周期动态变化）。**动态时长铁律**：周期快就把动画演得快、慢就慢，**别写死时长**。常见做法：用 `phaseSec` 反比缩放动画速度（参考 `wheat-farm`/`orchard` 里的 `spd()`）。

## 4. 设计：让它像个"活的小世界"

分层（从下到上）：**场地 → 产物 → 角色 → 道具 → 特效**。

- **多个角色、各有行为**：用 kit 的 `makeCharacter({ kind })`：
  - `'hoe'` 干活（锄/采/挖，手臂挥动）
  - `'walk'` 来回搬运（左右走、自动转向、腿交替）
  - `'lazy'` 偷懒（下沉后仰、冒 `z`）——**强烈建议至少放一个**，这是"小世界"的灵魂。
  - 可选 `scale`、`shirt`(颜色)、`phase`(错峰)、`walkRange`。
- **错峰**：给每个角色/产物不同 `phase`，避免整齐划一的机械感。
- **产物**：自带会摆动、丰收会弹/闪的部件（参考 `wheat-farm/crops.ts`、`orchard/fruit-tree.ts`）。
- **留做细空间**：角色已分层 身体/手臂/工具/表情；可继续加帧、加随机动作（擦汗、打哈欠）、加道具。
- **进度条是皮肤的一部分**：用 kit 的 `makeProgressBar(width)` 放在头顶（如 `bar.view.position.set(0, -tileSize*0.42)`），并在返回的 `setProgress(p)` 里 `bar.set(p)`。

## 5. kit（平台 SDK）能用什么

`import { ... } from '../../kit'`：
- **精灵图（推荐美术路径，见 §5b）**：`loadSpriteSheet(jsonUrl)`、`makeSpriteUnit(states, opts)`、`makeDebugFrames()`。
- **像素绘制（见 §5d）**：`makePixelTexture(w,h,draw)`（逻辑像素画布 → 最近邻 Texture）、`cssHex(0xRRGGBB)`。
- **田园像素部件**：`buildFarmerStates(shirt)`（农民 idle/harvest 帧）、`buildLazyFrames(shirt)`、`buildWheatFrames()`、`buildGroundTexture()`、`buildSackTexture()` —— 直接拼一个像素农场/果园（`wheat-farm`/`orchard` 即用这些）。
- **进度条**：`makeProgressBar(width) → { view, set(p) }`（头顶成熟度条）。
- **运动 / 补间（GSAP，见 §5c）**：`harvestPop(view)`、`breathe/sway/bob(target)`、`killMotion(view)`、`gsap`。
- `makeCharacter(opts) → { view, update(t), celebrate() }`：通用程序化小人骨架（矢量风时用）。注意它的 `update(t)` 吃**绝对累计时间**；在你的 `update(dt)` 里维护 `elapsed += dt` 再传入。
- 土地相关（`buildPixelFarmLand/buildFarmLand/makeTree/...`）：主要给土地皮肤用（见 create-land-skin SKILL）。

> 两种实现方式都合法、同一接口：**精灵图皮肤（推荐）** 或 **程序化皮肤**（当前 wheat-farm/orchard）。

## 5b. 用精灵图做皮肤（推荐：最像素、最易做细）

管线：Aseprite/TexturePacker 画帧 → 导出 `sheet.png` + `sheet.json` → 放进本皮肤文件夹 → kit 加载。

1. 在 Aseprite 用 **frame tags** 给动画分组命名（如 `idle`、`work`、`harvest`），File → Export Sprite Sheet（勾选 JSON Data、Array、按 tag 分）。导出的 `sheet.json` 的 `meta.frameTags` 会变成 Pixi `Spritesheet.animations` 的键。
2. 把 `sheet.png` + `sheet.json` 放进 `src/skins/assets/<id>/`。
3. 皮肤清单用**异步 `load()` 预加载**（引擎会在首次 build 前 await 它），`build()` 保持同步：

```ts
import type { AssetSkin } from '../../types';
import { loadSpriteSheet, makeSpriteUnit, type StateFrames } from '../../kit';

let frames: StateFrames | null = null;
const skin: AssetSkin = {
  id: 'fishery', name: { en: 'Fishery', zh: '渔场' },
  load: async () => { frames = await loadSpriteSheet(new URL('./sheet.json', import.meta.url).href); },
  build: ({ tileSize }) => makeSpriteUnit(frames!, { tileSize, fit: 0.72, fps: 8 }),
};
export default skin;
```

- `makeSpriteUnit` 默认循环播 `idle`；`setState('work')` 切常驻状态；`onEvent('harvest')` 播一次 `harvest` 再回 `idle`，并叠加 GSAP 弹跳。
- 像素清晰：kit 已设最近邻缩放。`fit` 控制单位占格子比例，`fps` 控制帧率。
- 没有美术想先打通管线？用 `makeDebugFrames()` 生成占位帧。
- 一个"生产小世界"可以是**一张大场景精灵图**，也可以多个 `makeSpriteUnit` 拼（多角色各一张表）。

## 5d. 程序化像素（无外部素材时的「像素标准」）

没有 Aseprite 素材、又要像素风时，用 kit 的 `makePixelTexture(w, h, draw)`：在【逻辑像素尺寸】的小画布上 `fillRect` 作画（1px = 1 像素块），返回最近邻 Texture，再放大显示 → 真像素。

**参考皮肤：`assets/wheat-farm/`、`assets/orchard/`**（都用 kit 的田园像素部件 `buildFarmerStates`/`buildWheatFrames`/… 搭成）。约定：
- 同一皮肤所有元素都按「每格 tile = `ART_GRID` 个逻辑像素」作画，统一用 `unit = tileSize/ART_GRID` 缩放 → 全场景共享一套像素网格，颗粒一致。
- 多元素用 `Sprite`（静态）+ `AnimatedSprite`（角色/作物多帧）合成；丰收时切 cheer 帧 + `harvestPop`。
- 角色/产物的逻辑尺寸固定（如农民 14×18），以后用 Aseprite 按相同逻辑尺寸导出 → 无缝替换。

> 风格是皮肤的事：像素皮肤=低分辨率 nearest 素材，平滑/日漫皮肤=高清素材，引擎一视同仁。
> 想全局像素？不要加全局滤镜（会压死非像素皮肤）——把各皮肤做成像素皮肤即可。

## 5c. 用 GSAP 做运动（点缀/丰收）

`kit/motion.ts` 用 GSAP 提供声明式补间，替代手写 sin/lerp：
- `harvestPop(view)`：丰收 squash&stretch 弹跳（`makeSpriteUnit` 已内置调用）。
- `breathe/sway/bob(target, amp, { duration, delay })`：循环呼吸/摇摆/浮动，返回 tween；`destroy` 时 `killMotion(view)` 清理。
- **铁律**：不要对**同一属性**既用 GSAP 补间、又在 `update(dt)` 里逐帧赋值——会打架。精灵图皮肤天然没有逐帧赋值，最适合 GSAP。

## 6. 自测

1. `npm run typecheck` 必须过。
2. 跑起来：`npm run dev`（或用现有预览），点右下 **＋添加资产** → 在「外观」选择器里选你的皮肤（自动列出所有已注册皮肤的缩略图）→ 添加，确认出现在格子里、动画流畅、扩张/缩放正常。
3. 金额给大一点，让收成 ~1~3 秒一次，方便观察四个阶段与丰收。
4. 确认：进度条随收成爬升、working1/2/3 节奏随之变化、满了丰收（欢呼 + `+X`）。点单位可编辑/删除。

## 7. 检查清单

- [ ] 文件夹放在 `src/skins/assets/<id>/`，`index.ts` 默认导出 `AssetSkin`
- [ ] `id` 唯一；`name` 含 `en` 与 `zh`
- [ ] 以 (0,0) 为中心绘制，整体不超出 `tileSize` 太多
- [ ] 实现 4 个事件 `working1/2/3` + `harvest`，并用 `phaseSec` 做**动态时长**（不写死）
- [ ] 头顶有进度条（`makeProgressBar` + 返回 `setProgress`）
- [ ] `destroy` 清理（含 `killMotion`/GSAP 与子节点）
- [ ] 只 import `../../types` 与 `../../kit`，无跨皮肤 import
- [ ] 至少 2 个角色 + 建议 1 个偷懒的；各有 `phase`
- [ ] `typecheck` 通过、浏览器实测动画 OK
```
