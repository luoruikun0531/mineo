# 12 · 桌面挂件打包发布

挂件 = Tauri 应用（`src-tauri/`），把构建好的 web 前端（`dist/`）包成一个**无边框、始终置顶**的 macOS 窗口（`?mode=widget`），按配对码从云端镜像农场。

## 推荐：GitHub Actions 自动出包

`.github/workflows/release-widget.yml`——**推一个版本 tag 即自动构建并发布**：

1. **（一次性）加两个 GitHub secret**：仓库 `Settings → Secrets and variables → Actions` →
   `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（同 Cloudflare 那两个；挂件前端靠它们做云同步，不配挂件就同步不了）。
2. **推 tag 触发**：`git tag v0.1.0 && git push origin v0.1.0`（或在 Actions 页 Run workflow）。
3. GitHub 的 macOS runner 自动 `npm run build` + `tauri build`，出**通用 .dmg**（Intel + Apple Silicon），并建一个 Release 挂上去。
4. 主页「💻 下载挂件」按钮指向 `releases/latest`，自动生效。

## 未签名说明
没有 Apple 开发者证书 → 包未签名，用户首次打开需**右键 App →「打开」**绕过 Gatekeeper（Release 说明里已写）。想去掉这个提示：99 刀/年的 Apple 开发者账号 + 在 workflow 加签名/公证密钥（`APPLE_CERTIFICATE` 等 secret）。

## 本地出包（备选）
在 Mac 上 `npm run tauri build` → 产物在 `src-tauri/target/release/bundle/`（`dmg/` 与 `macos/`），手动传到 Releases 即可。需要本机装好 Rust + Xcode 命令行工具。
