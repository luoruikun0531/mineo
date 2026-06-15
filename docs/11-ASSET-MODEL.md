# 11 · 资产模型 v2（归一化 value/productivity + 投资）

> 把资产从"现金流/投资两类、收成攒账本"重塑为：**所有资产归一化成 value + productivityPerSecond**，
> 总览看**总价值/一日·一月生产力/目标进度**；新增**股票/ETF 实时价格资产**。

## 1. 归一化：所有资产 → value + productivityPerSecond

每个资产（`src/domain/types.ts`）都有归一化核心字段：
- `value`（当前价值）= `quantity * unitValue`，并随 `productivityPerSecond` 随时间**确定式累积**
  （`currentValue = valueBase + productivityPerSecond * 已过秒数`，见 `earnings.ts`；无需每帧写库；编辑时结转）。
- `productivityPerSecond`：每秒稳定产出的价值，驱动进度条与"爆金币"动画（投资类为 0）。

4 类资产录入字段不同，但都落地成这套（`assetInput.ts` 的 `buildAsset`）：

| 类型 | 录入 | quantity | unitValue | value | productivityPerSecond |
|---|---|---|---|---|---|
| 现金流 cashflow | 年收入 | 0 | 0 | 0 | annualIncome / 年秒 |
| 存款 deposit | 本金 + 年利率 | principal | 1 | principal | principal·rate / 年秒 |
| 房产 realestate | 估值 + 租金 | 1 | estimatedValue | estimatedValue | annualRent / 年秒 |
| 投资 investment | 代码 + 股数/金额 | shares | latestPrice | shares·price | 0 |

## 2. 总览 4 指标（`domain/metrics.ts` + `ui/TopBar.tsx`）

- **总价值** = Σ currentValue（每秒 `useNow` 实时跳）。
- **一日 / 一月生产力** = 总价值过去 1 天 / 30 天的变化。优先用**价值快照**（每 ~30 分钟存一条，裁剪到 31 天）算真实变化（含股票涨跌）；历史不足时确定式估计（赚息线性 + 股票按当日涨跌折算）。
- **目标进度** = 总价值 / `settings.goalValue`（设置里可改，默认 100 万）。

> 旧的「收成账本（本日/累积）」已移除；金币动画保留为**纯视觉**（productivity 驱动）。

## 3. 投资：实时价格（cache-aside）

前端只打自家 `/api/quotes?symbols=AAPL,QQQ`：
- **dev**：`vite-plugin-quotes-mock.ts` 返回假价格（已知代码：AAPL/NVDA/TSLA/MSFT/AMZN/QQQ…；未知代码查不到 → 录入被拦截）。
- **prod**：`worker/index.ts`（Cloudflare Worker，静态资源 + `/api/quotes` 路由）cache-aside over KV：
  新鲜（<30 分钟）直返；过期返旧值 + 后台刷新；未命中同步拉 Twelve Data 写 KV。只缓存请求过的代码。

`src/market/quotes.ts`：`fetchQuotes` / `lookupQuote`（录入"查价"按钮拦截无效代码）。
`store.applyQuotes` 每 5 分钟刷新投资的 latestPrice/dayChangePct → value。

### 部署行情后端（要你做）
本项目部署为 **Cloudflare Worker**（`wrangler.jsonc` + `worker/index.ts`：静态资源 `dist/` + `/api/quotes` 路由）。
1. **KV**：建一个 KV namespace，把它的 id 填进 `wrangler.jsonc` 的 `kv_namespaces[].id`（绑定名 **`QUOTES`**）。
2. **Secret**：在 Worker → Settings → Variables and Secrets 加 **`TWELVE_DATA_KEY`**（类型 Secret）= 你的 Twelve Data API key。
3. Workers Build：Build command `npm run build`，Deploy command `npx wrangler deploy`。换行情源（Finnhub/FMP）只改 `fetchFromProvider`。

## 4. 投资动画（7 档）+ 涨跌标签（`engine/board.ts`）

投资类**无进度条/金币**（`handle.setQuoteMode(true)` 隐藏进度条）；改为：
- 资产**正上方**浮一个**当日涨跌幅**标签（绿涨/红跌，描边像素数字），**上下跳动**（跟"爆金币"同款律动，但持续循环）。
- 当日涨跌 → 7 档 `PriceState`（up3/up2/up1/plain/down1/down2/down3，阈值 +10/+5/+1/±1/-5/-10%），
  通过 `handle.setPriceState(state)` 驱动皮肤的 `quote` 行为层切片段。

## 5. 皮肤库按类别/代码（scope）

`RegistryEntry.scope { kinds?, symbols? }` + `skinAppliesTo()`：
- 无 scope = 通用（所有类别可选，作默认库）。
- `kinds:['cashflow']` 等 = 该类别专属。
- `symbols:['AAPL']` = 投资专属代码皮肤，仅该代码可选。

每类都有**默认皮肤（都带动画）**：现金流→果园/麦田场，存款→银行，房产→别墅，投资→办公室/工厂。
SkinPicker 按当前资产（类别 + 代码）过滤。5 个示例股票皮肤（`public/skins/stock-<sym>/`）= 写字楼 + 闪烁窗 + 楼顶公司招牌（logo），scope 到各自代码；是**占位像素**，真 AI 美术用图片 API 生成后替换 PNG 即可。

> 「建筑」皮肤的程序化美术见 `src/skins/_export/buildings.ts`；改/加皮肤后用 `runExport.ts` 在浏览器里重渲染落盘到 `public/skins/`。

## 6. 数据迁移

存储 key 升到 `mineo:v2`；旧 v1 数据（旧资产模型）自动失效（pre-launch 重置）。
