# 10 · 皮肤包与本地化（Skin Packages & Localization）

> 皮肤从「打进 bundle 的程序化代码」改造为「**用户按需下载、存在本地的图片包**」。
> 目标:① 皮肤 = AI 可生成的 PNG 图片(不再 canvas 手绘);② 不让皮肤成为 web 端的存储/带宽压力;③ 桌面挂件也从本地读皮肤。

## 1. 一个皮肤 = 图片包

```
public/skins/<id>/
  manifest.json     # 声明:分层/行为/动作/事件编排/进度条(资产)；颜色/UI(主题)
  *.png             # 美术全部来自 PNG(可 AI 生成),帧名 = 文件名
```

- **资产皮肤**(生产小世界):`AssetManifestSchema` —— 多层(static/plant/worker/idler)+ 动作配方 + 进度条。
- **主题皮肤**(土地+天空+UI):`ThemeManifestSchema` —— 少量纯色 + UI token + 12 张固定命名贴图。
- Schema 见 `src/skins/format/manifest.ts`。作者指南见两个 skill:`create-asset-skin`、`create-land-skin`。

## 2. 解释器(runtime)—— 把图片演成皮肤,引擎零改动

- `src/skins/runtime/interpretAsset.ts`：manifest + PNG → `AssetSkin`(分档提速、丰收弹跳、环境动作全程序化施加,**AI 只需出静图**)。
- `src/skins/runtime/interpretTheme.ts`：manifest + PNG → `ThemeSkin`(复刻土地+天空布局,纹理换成 PNG、纯色来自 manifest)。
- 产出的是引擎本来就认识的 `AssetSkin`/`ThemeSkin` 契约,所以 `engine/board.ts`、`engine/GameCanvas.tsx` **一行没改**。
- 通用纹理加载 `runtime/texture.ts`(用 `<img>`+onload,兼容 data:/blob:/路径)。

## 3. 本地化:Registry + IndexedDB

```
        Registry (public/skins/registry.json)         小清单:列出可用皮肤 + 默认集
                          │ 拉清单
        ┌─────────────────┴───────────────────┐
   web 端(浏览器)                          挂件(Tauri)
   ├ 本地库 IndexedDB(store/db.ts)         ├ 本地库 IndexedDB(独立)
   ├ 下载:fetch 包→Zod 校验→存 Blob          ├ 按同步来的选择→缺哪个下哪个
   ├ loader:本地包→解释→注册               ├ 同一套 loader/解释器
   └ 引擎照常渲染                            └ 引擎照常渲染
                          │
            选择(themeId + 每个资产 iconId)走 Supabase 同步
```

- `store/db.ts`：IndexedDB(`idb`),按 id 存 `{manifest, blobs}`。
- `store/download.ts`：`fetchRegistry` / `downloadPackage`(Zod 校验)/ `installDefaults`。
- `loader.ts`：`loadSkinsFromStore`(空库→自动下默认)、`installAndRegisterSkin`(商店下载按钮)、`ensureSkinsInstalled`(补装同步选择引用、本地还没有的皮肤)。
- `index.ts`：`initSkins()` 取代旧的 `installDefaultSkins()`;App 的 `SkinGate` 先 await 它(空库时显示"正在准备皮肤…")再渲染。

## 4. 皮肤商店 UX

`src/ui/SkinPicker.tsx` 现在是「商店」:列出 Registry 全部资产皮肤;已装的显示真实渲染缩略图可选,未装的灰显 + 右下角圆形下载按钮(带下载中转圈)。点下载 → 入本地库 → 注册 → 变成可选缩略图。

## 5. 托管与成本

- Registry 几 KB + 各包几十 KB 的 PNG,放 web 端静态目录(`public/skins/` → `dist/skins/`,Cloudflare CDN 缓存),**下到本地后不再回源**;要彻底零成本可把包迁到 R2/GitHub Releases,改 registry 里的 `base` 即可。
- 未来加皮肤 = 加图片包到 Registry,**不增大 app bundle**。

## 6. 老皮肤是范例 + 构建期生成器

- `public/skins/{orchard,wheat-farm,pastoral-day,pastoral-dusk}` 是从早期程序化皮肤导出的 PNG 包,作为**作者范例**。
- 导出工具 `src/skins/_export/`(dev 期把 kit 程序化贴图渲染成 PNG)+ Vite dev 端点 `/__export_skin`(`vite-plugin-skin-export.ts`)只在开发期用,不进生产;范例 manifest 见 `_export/packages.ts`。
