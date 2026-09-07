# i-thinking 跟版 / 补丁 / 发布密钥

## 钉版本

1. 在 `D:\i-thinking-browser\chromium\src` 检出稳定 milestone tag（以 `chrome/VERSION` 为准）。
2. 记录到 `apps/browser/config.json` → `chromiumMilestone`（字符串）。
3. 应用 `overlay/` + `pnpm command browser apply`（wire 策略链）+ `patches/`。

## 冲突高发目录

- `chrome/browser/ui/bookmarks/controllers/adapters/desktop_bookmark_bar_action_adapter.cc`（书签栏「应用」入口）
- `chrome/browser/ui/webui/chrome_web_ui_configs.cc`
- `chrome/chrome_paks.gni`（WebUI pak 必须列入，否则 `chrome://i-thinking` ERR_FAILED）
- `tools/gritsettings/resource_ids.spec`（新增 WebUI grit 资源时）
- `chrome/install_static/*`
- `chrome/browser/ui/webui/i_thinking/**`（本产品，通常只 rebase 周边）

## 导出补丁

```powershell
pnpm command browser export-patches
```

## Google API 密钥（去掉「缺少 Google API 密钥」黄条）

官方说明：https://www.chromium.org/developers/how-tos/api-keys/

### 获取

1. 用 Google 账号订阅 [chromium-dev](https://groups.google.com/a/chromium.org/g/chromium-dev)（可不收邮件）。
2. [Google Cloud Console](https://cloud.google.com/console) 建项目，启用需要的 API（如 Chrome Sync、Safe Browsing 等；新版 Console 常要求 API 限制，勾选已启用的即可）。
3. **凭据** 中创建：
   - **API 密钥**
   - **OAuth 客户端 ID**（应用类型：**桌面应用**）→ Client ID / Client secret

### 开发机（环境变量，不进安装包）

```powershell
$env:GOOGLE_API_KEY = "..."
$env:GOOGLE_DEFAULT_CLIENT_ID = "..."
$env:GOOGLE_DEFAULT_CLIENT_SECRET = "..."
# 再启动 out\i-thinking\chrome.exe
```

也可写入用户/系统环境变量，新开终端后生效。

### 发布版（编进二进制，用户无需配置）

**不要**把真实密钥写进会提交到 Git 的文件。

| 文件 | 是否进 Git | 作用 |
|------|------------|------|
| `gn/args.release.gn` | 是 | release 构建开关（component off / official） |
| `gn/args.release.local.gn` | **否**（gitignore） | 真实 `google_*` 三键 |
| `gn/args.release.local.gn.example` | 是 | 模板 |

```powershell
copy apps\browser\gn\args.release.local.gn.example apps\browser\gn\args.release.local.gn
# 编辑 local 文件填入三键

pnpm command browser configure --release
pnpm command browser build
pnpm command browser stage
```

`configure --release` 会把 `args.release.gn` + `args.release.local.gn` 合并写入  
`D:\i-thinking-browser\chromium\src\out\i-thinking\args.gn` 再 `gn gen`。

默认 `chrome_pgo_phase = 0`（关闭 PGO），避免缺少 `pgo_profiles` 导致 `gn gen` 失败。若需要官方级 PGO：在 `.gclient` 的 `custom_vars` 设 `checkout_pgo_profiles: True`，`gclient runhooks` 拉 profile 后去掉该 GN 项。

### 边界说明

- 密钥编进安装包后仍可被提取；遵守 Google API ToS，密钥勿外传。
- 多数 API 配额很低；自建 Chromium 的 **Google 账号登录 / Sync 仍常受限**。
- 产品功能尽量不依赖 Google Sync；黄条不影响 `chrome://i-thinking` 等自有能力。

## 应用发布（不要把整个 `out` 丢给用户）

`out\i-thinking\` 里文件极多是正常的：含中间产物（`obj\`、`gen\`、`.lib`、PDB 等）。**不能**整目录当安装包。

| 目录 | 给谁 | 说明 |
|------|------|------|
| `...\src\out\i-thinking\` | 仅开发机 | 全量编译树，体积巨大 |
| `apps/browser/build/runtime\` | 暂存 / 冒烟 | `browser stage` 只拷运行所需 exe/dll/pak 等，并改名为 `i-thinking.exe` |
| `apps/browser/build\i-thinking-setup.exe` | 最终用户 | 用 NSIS（或其它安装器）打 zip/安装包 |

### 推荐发布流水线

```powershell
# 一键（与 apps/browser package.json 的 build 相同）
pnpm --filter @i-thinking/browser build
# → vite → sync → apply → configure --release → chromium build → stage
# → apps/browser/build/runtime\i-thinking.exe + 依赖 dll/pak/locales

# 本机冒烟
& ".\apps\browser\build\runtime\i-thinking.exe" --user-data-dir="$env:LOCALAPPDATA\i-thinking"

# 打安装包（需本机 makensis；未含在 package.json build 内）
pnpm browser pack
# 可选：python apps/browser/installer/generate-assets.py
# → apps/browser/build\i-thinking-setup.exe
```

说明：

- **开发**用 `args.gn`（`is_component_build = true`）→ dll 特别多，迭代快，**不适合**当正式分发。
- **发布**用 `configure --release`（`is_component_build = false`）→ 运行时文件少很多，再 `stage`。
- 若刚从 component 切到 release，等于换了一套链接方式，**首次 release 构建会再编很久**，属预期。
- 正式对外前：代码签名安装包 / 可执行文件；测卸载与用户数据目录 `%LOCALAPPDATA%\i-thinking`。

也可用 zip：把 `build\runtime\` 整夹压成 `i-thinking-win-x64.zip` 内测，仍比发整个 `out` 干净。

## 安全边界

- 特权仅 `chrome://i-thinking`
- 普通 https 标签无 Node / 无任意 IPC
- 安装包需代码签名后再分发
- 真实 `google_*` 只放本机 `args.release.local.gn` 或 CI 密钥库，勿提交仓库
