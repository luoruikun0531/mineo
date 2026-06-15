# 08 · 皮肤系统（土地+UI / 资产）

> 核心理念：**所有视觉都是"可动画、可切换、可替换的皮肤"**，以最大化视觉体验。
> 用户后续可注入自己把关的素材皮肤来替换默认实现。

## 1. 两类皮肤（仅两类，刻意不复杂化）

| 类别 | 范围 | 在哪选择/替换 |
|---|---|---|
| **ThemeSkin（土地 + UI）** | 土地场景（地基/耕地/装饰/动画）+ HUD 外观 token | 主界面左下 🎨 按钮 |
| **AssetSkin（资产）** | 单个资产单位的外观 + 运作/收成动画 | 添加 / 编辑资产时 |

## 2. 统一接口（`src/skins/types.ts`）

两类皮肤都遵循"构建一个可动画的 Pixi 视图 + 留替换口"：

```ts
interface SceneHandle {
  view: Container;                  // 挂到舞台
  size?: { width; height };         // 居中用
  update?(dtSeconds): void;         // 每帧推进动画
  destroy?(): void;
}

interface ThemeSkin {
  id; name: { en; zh };
  grid: { cols; rows; tileSize };   // 可种植方格
  canvasBackground: number;         // 画布底色
  buildLand(): SceneHandle;         // 动画化土地
  ui: UITokens;                     // 写入 CSS 变量，驱动 HUD
}

interface AssetSkin {
  id; name: { en; zh };
  build(ctx: { tileSize }): AssetSkinHandle;  // = SceneHandle + onEvent(event)
}
```

> **抽象事件（4 个）**：`working1`(<25%) `working2`(<50%) `working3`(<75%+) `harvest`(满)。
> 引擎按进度发 `onEvent(event, phaseSec)`；`phaseSec` 是该阶段动态时长，皮肤据此铺满动画（无固定时长）。
> 另：`ThemeSkin.buildBackdrop(w,h)` 提供全屏皮肤背景（屏幕空间），使"整个页面都是皮肤"。

> **架构铁律（主程序 ↔ 皮肤 的边界）**：主程序只通过 `onEvent(抽象事件)` 与 `update(dt)`
> 跟皮肤沟通，只知道"现在什么状态/发生了什么"。素材是什么、怎么编排、是否用 GSAP、
> 像素还是日漫——**全部封装在皮肤包内部，主程序与 GSAP 互不感知**（GSAP 只是皮肤的播放器）。
> 引擎只负责：把皮肤的 `view` 放到地图上（位置）、相机、转发时钟、做中性过渡（位置/alpha）。

> **皮肤与资产类型（cashflow / investment）完全解耦**：所有皮肤同属一个共享池，
> 任何皮肤都能用于任何类型。类型**只**决定录入项与收益算法
> （现金流=年收入；投资=本金+预期年化率），不决定外观。
> 所以默认皮肤都是"生产小世界"，没有"投资专用/现金流专用"之分。

- `UITokens` → 通过 `applyUITokens()` 写入 `:root` CSS 变量，React HUD 外观随主题切换。
- `AssetSkinHandle.onEvent('harvest')` → 主程序发抽象事件，皮肤自己决定怎么演（弹跳/闪光）。

## 3. 插件化：一个文件夹 = 一个皮肤（完全隔离）

皮肤是**插件**，为未来庞大扩展而设计：

```
src/skins/
  types.ts                 平台契约（接口）
  registry.ts              注册表（register/list/get）
  loader.ts                自动发现：import.meta.glob 扫描皮肤文件夹
  index.ts                 installDefaultSkins() → loader
  kit/                     平台 SDK（稳定 API，皮肤可复用的通用积木）
    motion.ts                GSAP 运动：harvestPop/breathe/sway/bob（替代手写 sin/lerp）
    spritesheet.ts           精灵图：loadSpriteSheet / makeSpriteUnit（AnimatedSprite 状态机）/ makeDebugFrames
    character.ts             通用程序化小人骨架（hoe/walk/lazy）
    landParts.ts             土地装饰 + LandPalette 类型
    buildFarmLand.ts         通用田园土地构建器
  themes/<id>/index.ts     每个土地+UI 皮肤一个文件夹（默认导出 ThemeSkin）
    _template/             复制即用的模板（_ 开头被加载器忽略）
  assets/<id>/index.ts     每个资产皮肤一个文件夹（默认导出 AssetSkin）
    <id>/parts...            皮肤私有部件放在自己文件夹内
    _template/
```

**隔离规则（硬约束）：** 皮肤文件夹只可 `import` `../../types` 与 `../../kit`，
**绝不可** import 其它皮肤文件夹。删一个文件夹 = 删一个皮肤，互不影响。

**自动发现：** `loader.ts` 用 `import.meta.glob('./{themes,assets}/*/index.ts')`
扫描，取每个文件夹 `index.ts` 的 **default 导出**注册。
**放进一个文件夹（含 index.ts 默认导出皮肤）即多一个皮肤，无需改任何中心文件。**

**kit（平台 SDK）：** 通用积木（角色骨架、土地构建器、装饰、**GSAP 运动**、**精灵图加载**），稳定 API。
皮肤可用 kit，也可完全自带美术；这不破坏"皮肤间隔离"——kit 是平台，不是皮肤。

**动画技术栈（已定）：** 渲染 = PixiJS v8；补间/运动 = **GSAP**（2025 起全免费，含商用）；
资产美术主路径 = **精灵图**（Aseprite → PNG+JSON → Pixi `AnimatedSprite`，`kit/spritesheet.ts`）；
**Spine**（官方 `@esotericsoftware/spine-pixi-v8` 运行时）留作高端单位的升级路径——同一 `AssetSkin` 接口可容纳，无需改引擎。
资产皮肤可选 `load?(): Promise<void>` 预加载精灵图（引擎在首次 build 前 await `preloadAssetSkins()`），`build()` 保持同步。
精灵图皮肤示例见 `assets/sprite-demo/`（占位帧）。

> **如何创建新皮肤**：见两个 SKILL —— `.claude/skills/create-asset-skin/` 与
> `.claude/skills/create-land-skin/`（含文件夹结构、接口契约、约定与检查清单）。
> 或直接复制对应的 `_template/` 文件夹起步。

## 4. 默认皮肤（MVP，手写程序化 = 占位）

### ThemeSkin（土地+UI）
- `themes/pastoral-day`、`themes/pastoral-dusk` —— 各自含色板，复用 `kit/buildFarmLand`。
- 土地构成：圆角草地基 + 落影、外圈泥土小径、动态 n×n 耕地棋盘、上下篱笆、
  两棵树、池塘、花丛、漂移的云、暖阳光晕。
- 动画：树冠摆动、花朵浮动、池塘涟漪、云朵漂移、阳光呼吸（单一 ticker 驱动）。

### AssetSkin（资产，均为"生产小世界"，与类型无关）
- `assets/wheat-farm`：三排麦子 + 锄地/搬运农民 + 偷懒农民 + 粮袋。
- `assets/orchard`：三棵果树 + 采摘/搬运工 + 树下打盹的 + 果筐。
- 都用 `kit/character` 的小人骨架；私有部件（crops / fruit-tree）放各自文件夹。
- 动画：角色行为循环、产物摆动；`onEvent('harvest')` 触发闪光 + 欢呼。

## 5. 渲染接线（`src/engine/GameCanvas.tsx`）

- 单个 Pixi `Application` + 单个 `world` 容器 + 单个 ticker。
- ticker 每帧 `land.update(dt)`（dt 限幅 0.1s 防跳变）；资产单位（M2 起）也在此循环更新。
- `themeId` 变化 → 销毁旧土地、`buildLand()` 新土地、应用 `canvasBackground`、重新居中。

## 6. 与里程碑的关系

- 本次（M0.5）落地：皮肤系统骨架 + 默认土地皮肤（动画）+ 主界面切换 + UI 随主题变。
- M2/M3：资产落位时用 AssetSkin 渲染单位；添加/编辑资产 UI 接入 AssetSkin 选择器。
- 美术升级（M4）：用 AI 精灵图实现新的 ThemeSkin / AssetSkin，注册即替换，无需改业务逻辑。

## 7. 🟡 后续可选

- 皮肤选择的持久化（存入 Settings：`themeId`、各资产 `assetSkinId`）——M2 接 store 时一并做。
- 皮肤预览缩略图（列表里小动画预览）。
- 每个资产可独立换肤的编辑入口。
