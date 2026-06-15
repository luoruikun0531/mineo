# 09 · 桌面组件（Desktop Widget）

> 目标：一个**只读展示**的桌面挂件——第一行收成数字，下面只显示"格子之内"的资产小世界。
> 编辑/清零/换肤等都在 **web 端**完成，桌面端只展示并同步。

## 1. 原则：同一套代码，皮肤/动画 100% 复用

桌面组件不是另一个工程，而是**同一个 app 的"widget 模式"** 被 Tauri 套壳。
- 渲染、引擎、皮肤、动画全部复用（同一个 `GameCanvas` + `board` + `skins`）。
- 通过 URL `?mode=widget` 切换到展示版（`store.isWidgetMode()`）。

## 2. widget 模式做了什么（`src/app/App.tsx` → `WidgetApp`）

- **布局**：第一行 `widget-totals`（本日 / 累积收成）；下面 `widget-stage` 放 `<GameCanvas widget />`。
- **只看格子区**：`GameCanvas widget` 不建全屏背景；相机用 `camera.setFrame(plotRect)` 只框住可种植区（`board.getPlotRect()`），格子外的草地/树/池塘/天空都在视野外 → "格子之外全部不要"。
- **只读**：不接 `onUnitTap`（不可编辑）、`onHarvest` 为空（不写账本）；没有添加/设置/换肤/语言按钮。
- 动画照常跑（进度条爬升、`+X`、农民干活）——纯展示，赏心悦目。
- **拖动**：无边框窗口没有标题栏，所以顶部"收成条"兼作拖动把手——加了 `data-tauri-drag-region` 属性 + `cursor:move`，子元素 `pointer-events:none` 让整条都能抓。按住收成条即可把挂件拖到屏幕任意角落（仅 Tauri 内生效，浏览器里是无害的空属性）。
- **外观滤镜（皮肤之上，非新皮肤）**：右上角小齿轮 → 面板可调 **透明度**（30%–100%）与 **黑白**。实现为 CSS 滤镜，套在 `.widget-fx` 这层（只裹收成条+农场；齿轮/面板在层外，调到很透明/黑白时仍清晰可操作）：透明度 = `opacity`，黑白 = `filter: grayscale(1)`（CSS 滤镜会作用到子级 `<canvas>`，所以整个 Pixi 农场一起变灰）。这些是**本机本地偏好**（`src/widget/prefs.ts`，localStorage key `mineo:widgetprefs`），**不入资产快照、不参与云同步**——web 端不该决定你桌面挂件多透明。
  - 透明度要真正"透出桌面"需窗口本身透明：`tauri.conf.json` 给 widget 窗口设 `transparent:true` + `app.macOSPrivateApi:true`，并在 `Cargo.toml` 给 tauri 加 `macos-private-api` 特性（macOS 透明窗口必需）。默认 100% 时挂件不透（正常观感），拉低才透。浏览器里没有透明窗口，低透明度会与网页底色混合（看着发黄），属正常；装进 Tauri 后混合的是桌面。

## 3. 同步模型：web 端写云，widget 读云（配对码）

**没有桌面主窗口**——主程序就是浏览器里的 web 端。桌面只有一个挂件，它**读 web 端的设置**。
浏览器 与 独立 Tauri 是两套 `localStorage`（不同 webview），本地无法互通，所以用一层**轻量云**做桥：

- **配对码（pairing code）**：6 位易读码（去掉易混字符），`src/persistence/local.ts` 的 `makeSyncCode()` 生成、存 `mineo:synccode`。web 端首次开启云同步时自动生成，显示在「设置」里。
- **web 端（写方）**：每次节流保存后，`store.ts` 的 `doSave()` 顺带 `pushState(code, snapshot)` 把快照 upsert 到云（`src/sync/cloud.ts`）。
- **widget（读方，`?mode=widget`）**：启动先要用户输入配对码（`WidgetPairScreen`），之后每 4s `pullState(code)` → `store.hydrate()`，**准实时**反映 web 端的增删改/清零/换肤；自己不回存、不计离线。
- **降级**：没配 `.env`（`cloudEnabled() === false`）时全部跳过云逻辑，回退到同源 `storage` 事件（同一浏览器开两个标签页仍可用），不影响 web 端本身。

```
web 端 (浏览器)            云 (Supabase)              widget (Tauri)
  编辑/清零/换肤   ──push──▶  farm_states[code]  ◀──poll──  只读展示
  设置里显示配对码                                  启动输入同一配对码
```

## 3b. 云端：Supabase（免费档够用）

代码用 **Supabase REST**（`src/sync/cloud.ts`，纯 `fetch`，无额外依赖）。配置两步：

**① 建表 + 开放匿名读写**（Supabase 控制台 → SQL Editor 跑一次）：

```sql
create table if not exists public.farm_states (
  code       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.farm_states enable row level security;

-- 配对码即"凭证"：知道码就能读写自己那一行（匿名 anon 角色）
create policy "read by code"  on public.farm_states for select using (true);
create policy "write by code" on public.farm_states for insert with check (true);
create policy "update by code" on public.farm_states for update using (true) with check (true);
```

> 安全说明：anon key 是**前端公开 key**（放进前端 `.env` 是 Supabase 的预期用法），不是密钥。
> 数据隔离靠"配对码足够随机"——30^6 ≈ 7 亿种。要更严可加 `code` 长度或换成带签名的 Edge Function；MVP 够用。

**② 前端 `.env`**（项目根目录，已在 `.gitignore`；变量名见 `src/vite-env.d.ts`）：

```bash
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # 控制台 Settings → API → anon public
```

改完 `.env` 要**重启 dev / 重新 build**（Vite 在构建时内联 `import.meta.env`）。

## 4. Tauri 桌面工程（挂件单窗口；本仓库含 `src-tauri/`，已实测构建出 `Mineo.app`）

关键配置与踩坑：
- `src-tauri/rust-toolchain.toml` 锁 **Rust 1.88.0**（rustup 按需自动装；只影响本项目）。
- `src-tauri/Cargo.toml` 给 `tauri` 关掉默认的 **`compression`** 特性 → 去掉 brotli。
  原因：默认拉的 `brotli 8.0.3` 与 `alloc-no-stdlib`（2.0.4 vs 3.0.0）版本错位，`StandardAlloc` 不满足 trait，编不过；compression 只是把内嵌前端资源压缩，去掉后资源未压缩内嵌（体积略大，功能不变）。
- `src-tauri/tauri.conf.json`：`com.mineo.tycoon` + **单个 widget 窗口**（`index.html?mode=widget`，无边框、置顶）；`bundle.targets: ["app"]`（见 §4b）。
- `src-tauri/capabilities/default.json`：`windows: ["widget"]`（不再是 `main`）+ 权限加 **`core:window:allow-start-dragging`**——否则顶部把手的 `data-tauri-drag-region` 拖不动窗口。

```jsonc
// app.windows[] —— 只有挂件，没有主窗口
[
  {
    "label": "widget",
    "title": "Mineo",
    "url": "index.html?mode=widget",   // dev 时用 http://localhost:5173/?mode=widget
    "width": 300, "height": 380,
    "minWidth": 220, "minHeight": 280,
    "resizable": true,
    "decorations": false,              // 无边框
    "alwaysOnTop": true                // 常驻桌面
  }
]
```

## 4b. 运行 / 打包 / 分享

- 先让 cargo 进 PATH：`source ~/.cargo/env`（或 `export PATH="$HOME/.cargo/bin:$PATH"`）。
- 开发（热重载）：`npm run tauri dev`（确保 `.env` 已配，否则挂件无法连云）。
- 打包：`npm run tauri build` → 产出 `src-tauri/target/release/bundle/macos/Mineo.app`（~9 MB）。

**分享给别人——对方什么都不用装：**
- 简单：把 `Mineo.app` 压成 zip 发过去，解压拖进「应用程序」即可（未签名，首次右键→打开）。对方打开挂件，输入你给的配对码即可看到你的农场（只读）；若对方有自己的 web 端，则输入对方自己的码。
- `.env` 在 **build 时**已内联进 app，分享出去的挂件自带云配置——对方只需输配对码，不碰任何 key。
- 正式安装包（`.dmg` / Windows `.msi`/`.exe`）：把 `bundle.targets` 改回 `"all"` 或加 `"dmg"`，**在有图形界面的 Mac**（或 CI）上打包——`.dmg` 依赖 Finder/AppleScript，无 GUI 的环境（如本次构建沙箱）会失败，所以默认用 `"app"`。
- 跨平台 + 你本地免装 Rust：GitHub Actions（`tauri-apps/tauri-action`）一次出 Mac/Windows 安装包（记得在 CI 注入 `VITE_SUPABASE_*` 环境变量）。

## 5. 取舍（桌面端更小）

- 桌面挂件只展示格子区，**单元会很小**——`tileSize`/进度条/名牌在小窗口里要保证可读；必要时给 widget 用更大的相机留白或限制显示的格子数。
- 资产很多（n 很大）时，挂件可只显示前若干个或允许滚动——后续再定。
- 同步是 **4s 轮询**（够"准实时"且省事）；要做到秒级可换 Supabase Realtime 订阅，后续再说。
- 当前是"知道码即可读写"的轻量模型；多人/强隔离场景需要真正的鉴权（登录或签名 Edge Function）。
