# 04 · 技术架构

## 1. 选型总览

| 层 | 技术 | 理由 |
|---|---|---|
| 语言 | TypeScript | 类型安全，团队/AI 协作友好 |
| 构建 | Vite | 快、生态成熟、Tauri 一等支持 |
| UI 框架 | React 18 | HUD/表单/向导用声明式 UI |
| 渲染引擎 | **PixiJS v8** | 像素完美的 2D WebGL，精灵/动画/合批性能强，最适合"地图上一堆动起来的小单位" |
| 状态管理 | Zustand | 轻量、无样板、易测；游戏循环与 React 解耦 |
| 校验 | Zod | 系统边界输入校验 |
| 存储 | IndexedDB（`idb` 封装） | 结构化本地持久化 |
| 桌面 | **Tauri v2** | 复用全部 Web 代码；体积小、支持透明置顶窗口做桌面挂件 |
| 测试 | Vitest + Testing Library + Playwright | 单元 / 组件 / E2E |

## 2. "不重复开发"的核心策略

整个应用是**一套 Web 应用**；Tauri 只是把它装进原生壳：

```
              ┌─────────────────────────────────────┐
              │        Web App (React + PixiJS)      │  ← 唯一代码源
              │   逻辑 / 渲染 / 状态 / 存储 全在这里     │
              └─────────────────────────────────────┘
                 │                          │
        浏览器直接运行              Tauri WebView 加载
                 │                          │
            Phase 1: Web          Phase 2: Mac/Windows 桌面挂件
```

- 桌面端**不重写任何业务逻辑**；只增加 Tauri 配置（窗口透明、置顶、托盘）和少量
  平台桥接（如"挂件模式"布局）。
- 平台差异通过 `platform` 适配层隔离（一个 interface，两套实现：web / tauri），
  业务代码只依赖 interface。

## 3. 分层架构

```
src/
├── domain/            纯逻辑，无 UI、无渲染依赖（最易测）
│   ├── harvest.ts        收成节流算法（见 03 文档）
│   ├── earnings.ts       年产出 → 每秒速率 r 推导
│   ├── currency.ts       货币/金币换算、格式化
│   └── types.ts          领域类型（Asset / Settings / Ledger）
├── state/             应用状态（Zustand store）
│   ├── store.ts          AppState、actions
│   └── selectors.ts
├── persistence/       存储适配
│   ├── db.ts             IndexedDB 封装
│   └── schema.ts         Zod schema + 版本迁移
├── engine/            PixiJS 渲染层（地图/单位/动画）
│   ├── GameCanvas.tsx    React 挂载点（包裹 Pixi Application）
│   ├── scene/            场景：地图网格、相机
│   ├── units/            资产单位精灵 + 运作动画
│   ├── effects/          收成动画、+X 飘字、进度条
│   └── loop.ts           主 rAF 循环：tick 所有资产 → 写账本
├── ui/                React HUD（覆盖在画布之上）
│   ├── TopBar.tsx        左上：本日/累积收成
│   ├── AddAssetWizard/   添加资产向导（多步表单）
│   ├── AssetInspector/   点击单位查看/编辑
│   └── components/       通用像素风 UI 组件
├── art/               占位美术（MVP：SVG/Canvas 程序化像素图）
│   └── icons/            预设资产图标/动画定义
├── platform/          平台适配（web / tauri）
│   └── index.ts
└── app/               应用装配、路由、主题
```

> 关键分层原则：`domain/` 完全纯净（无 React / 无 Pixi），可被 Node 直接单测。
> 渲染层（engine）与 UI 层（React）都从 `state/` 读数据，互不直接依赖。

## 4. 渲染层设计（PixiJS）

### 4.1 场景图层（从下到上）

1. **地面层**：方格地图 tile（暖色田园底图）。
2. **单位层**：每个资产一个 `UnitContainer`，含：
   - 精灵/动画（运作循环动画）
   - 进度条（跟随单位，`progress = elapsed/D`）
3. **特效层**：收成时的"满格闪光" + `+X` 飘字（向上飘 + 淡出）。
4. **（React HUD 在 DOM 层，叠在 canvas 之上）**

### 4.2 主循环（单一 rAF）

```
loop(dt):
  for asset in assets:
     tickHarvest(asset.harvest, dt, onHarvest)   // 见 03 文档
     unit.setProgress(asset.harvest.elapsed / asset.harvest.D)
  flushLedger()   // 把本帧累计的收成写入 store（合并，避免频繁 setState）
```

- Pixi 的 `Ticker` 提供 `dt`；React 不参与每帧渲染（性能关键）。
- 收成回调里：播放特效 + 累加一个"本帧收成缓冲"，帧末一次性提交到 Zustand →
  React 顶部数字平滑更新（可加滚动数字动画）。

### 4.3 React ↔ Pixi 边界

- React 负责：HUD、表单、向导、设置。
- Pixi 负责：地图与所有动画。
- 二者通过 Zustand store 通信（React 写资产数据，Pixi 读；Pixi 写收成账本，React 读）。
- 一个 `<GameCanvas>` 组件在 mount 时创建 Pixi `Application`，unmount 时销毁。

## 5. 状态流

```
用户操作 (React 表单)
   → store.addAsset() / editAsset()
   → 持久化 (debounced → IndexedDB)
   → engine 监听 assets 变化 → 增删 UnitContainer、重算 harvest

主循环 (Pixi Ticker)
   → tickHarvest → onHarvest
   → ledgerBuffer += X
   → 帧末 store.commitLedger(buffer) → 持久化 (节流)
   → React TopBar 重渲染
```

## 6. 性能注意

- 每帧不要 `setState`；用缓冲 + 帧末提交。
- 进度条/动画全部在 Pixi 内更新，不触发 React 渲染。
- 精灵用纹理图集（texture atlas）合批；占位阶段用程序化生成纹理并缓存。
- 后台标签页 rAF 被节流是正常的；恢复策略见 [03 §5.3](./03-HARVEST-ALGORITHM.md)。

## 7. 桌面挂件（Phase 2 预留）

- Tauri 窗口：`transparent: true`、`decorations: false`、`alwaysOnTop`（可选）、托盘菜单。
- "挂件模式"：精简 HUD，只显示地图 + 顶部收成；点击展开完整界面。
- 数据与 Web 完全一致（IndexedDB on WebView）。
- 这些都不改业务代码，只加配置与一个布局开关 → 满足"不重复开发"。
