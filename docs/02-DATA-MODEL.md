# 02 · 数据模型与存储

## 1. 概念实体

```
AppState
├── settings        全局设置（隐私模式等）
├── assets[]        所有资产单位
└── ledger          收成账本（本日 / 累积）
```

## 2. 类型定义（TypeScript）

```ts
// 支持的货币
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'SGD';

// 资产类型
type AssetKind = 'cashflow' | 'investment';

interface BaseAsset {
  id: string;              // uuid
  kind: AssetKind;
  name: string;            // "我的工资"
  iconId: string;          // 预设像素图标/动画 id
  cell: { x: number; y: number }; // 在方格地图上的位置
  createdAt: number;       // epoch ms
}
// 注意：货币与金币比例是【全局唯一】设置（见 Settings），不挂在单个资产上。
// 所有资产的金额都以 Settings.currency 录入。

interface CashflowAsset extends BaseAsset {
  kind: 'cashflow';
  annualIncome: number;    // 年收入（该货币计）
}

interface InvestmentAsset extends BaseAsset {
  kind: 'investment';
  principal: number;       // 当前金额
  annualReturnRate: number;// 预期年收益率，如 0.08 表示 8%
}

type Asset = CashflowAsset | InvestmentAsset;

// 地图格子数动态：2×2 起步，资产塞满即扩张（3×3、4×4…），扩张带动画。
//   gridN = max(2, ceil(sqrt(assetCount)))   （见 state/store.ts gridNFor）
// 镜头随 n 变化：n 小→视野低、格子大；n 大→视野拉高（相机平滑缩放，见 engine/camera.ts）。

interface Settings {
  currency: CurrencyCode;  // 【全局唯一】货币，全图所有资产共用
  privacyMode: boolean;    // 全局：是否以金币展示
  // 全局金币兑换比例：1 单位 currency = goldRate 金币（仅隐私模式用；金币面额更小）
  goldRate?: number;
}

interface Ledger {
  cumulative: number;          // 累积收成（展示单位）
  today: number;               // 本日收成（展示单位）
  todayDateKey: string;        // "YYYY-MM-DD"（本地时区），用于午夜重置
  countingSince: number;       // epoch ms：本轮累积起点（清零按钮会刷新它）
}
```

## 3. 收益速率推导

所有资产统一归一为"每秒产出速率 `r`"（展示单位/秒）。

```
SECONDS_PER_YEAR = 365 * 24 * 3600   // = 31,536,000

// 原始年产出（按资产自身货币）
cashflow:   annualYield = annualIncome
investment: annualYield = principal * annualReturnRate

// 每秒速率（资产自身货币）
rCurrency = annualYield / SECONDS_PER_YEAR

// 转换到展示单位（见下方"展示单位"）
r = toDisplayUnit(rCurrency, asset)
```

## 4. 货币与展示单位

### 4.1 全局单一货币（已定）

- **整个应用只有一个货币**（`Settings.currency`），所有资产的金额都以它录入。
  不支持多币种混合——因此顶部累计指标天然可直接加总，无需汇率表。
- 货币在首次进入时选择（也可在设置里改）。

### 4.2 隐私模式 = 全局开关

- 隐私模式是全局设置（`Settings.privacyMode`），一旦开启，**所有展示**以"金币"为单位。
- 隐私模式有一个**全局** `goldRate`（**1 单位 currency = goldRate 金币**）。
  金币面额比货币小，所以数字更大——既隐藏真实金额，又更有成就感。因为货币本就唯一，金币换算也只需一个全局比例。

```
// 货币金额 → 金币（乘以比例）
gold = amountInCurrency * settings.goldRate
```

### 4.3 展示单位决策表

| 模式 | `+X` 与顶部累计的单位 |
|---|---|
| 隐私模式开 | 金币 |
| 隐私模式关 | Settings.currency（全局货币） |

## 5. 收成账本（Ledger）

- 每次某资产触发一次收成 `+X`：
  - `ledger.cumulative += X`
  - 若 `todayDateKey` == 今天 → `ledger.today += X`；否则先重置 `today = 0` 再加。
- `X` 始终是**展示单位**下的整数（≥1）。
- 午夜重置：每帧/每次收成时比对本地日期 key（仅重置 `today`，不动 `cumulative`）。

### 5.1 清零按钮（已定）

提供一个手动「清零」按钮：按下后**本轮累积全部重置、重新开始计**。

```ts
function resetLedger(now: number): Ledger {
  return { cumulative: 0, today: 0, todayDateKey: dateKey(now), countingSince: now };
}
```

- 清零只影响账本（cumulative / today / countingSince），**不删除资产、不改资产收成**。
- UI 上对清零做二次确认（不可撤销）。

### 5.2 切换货币/隐私模式：不重算（已定）

- 切换货币或隐私模式时，历史累计**不重算**，仅影响后续展示。
- 想要"干净的新单位口径"时，用户可主动按清零按钮重新累积。
- 会在设置处用一行小字向用户说明这一行为。

## 6. 存储（本地）

- **IndexedDB**（通过轻量封装，如 `idb` 库）持久化 `AppState`。
  - 选 IndexedDB 而非 localStorage：结构化数据、容量更大、未来可存精灵缓存。
- 桌面端（Tauri）同样走 IndexedDB（WebView 内置），保证逻辑零差异。
  - 🟡 **OPEN（后期）**：桌面端是否改用 Tauri 的文件系统/SQLite 以便备份导出。MVP 不需要。
- 写入策略：状态变更时 debounce 持久化（避免每帧写盘）；
  收成账本可定期（如每 5s）落盘 + 退出时落盘。

## 7. 数据校验（边界）

录入时在系统边界做校验（schema 校验，推荐 `zod`）：

- 金额、年收入、本金：非负数值。
- 年收益率：合理区间（如 -1 ~ 10，即 -100% ~ 1000%），MVP 可限正数。
- goldRate：> 0。
- 名字：非空、长度上限。
- 货币：必须是枚举内值。

失败时给出清晰的用户友好提示，不静默吞错。
