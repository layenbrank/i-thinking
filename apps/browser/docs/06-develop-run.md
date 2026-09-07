# 06 — 开发、启动与打包

Chromium 流水线统一走仓库 CLI：`pnpm command browser <子命令>`（或 `pnpm browser …`）。

## 开发 WebUI（不编 C++）

```powershell
pnpm --filter @i-thinking/browser dev
```

- 地址：http://127.0.0.1:5173/
- 已安装 `itc` 桥（`src/bridges/itc-chromium.ts`），可在页面里调 `itc.shell.open`

浏览器已编出时，用热更开关加载该地址：

```text
--load-i-thinking-from-http=http://127.0.0.1:5173/
```

示例：

```powershell
& "D:\i-thinking-browser\chromium\src\out\i-thinking\chrome.exe" `
  --user-data-dir="$env:LOCALAPPDATA\i-thinking-dev" `
  --load-i-thinking-from-http=http://127.0.0.1:5173/
```

## 把 WebUI 打进 Chromium 资源

Vite 产物在 `apps/browser/dist/`（`index.html`、`css/`、`javascript/` 等，**gitignore**）。  
`pnpm browser sync` 会：

1. 拷贝到 `overlay/chrome/browser/resources/i_thinking/` 与本机 `CHROMIUM_ROOT` 对应目录  
2. **按 dist 文件列表重新生成** 该目录下的 `BUILD.gn`（`input_files`；勿手改）

上述 `resources/i_thinking/` 快照（除 `OWNERS`）**也不进 Git**。因此：

- 完整发布：`pnpm --filter @i-thinking/browser build`（内含 vite → sync → apply → `configure --release` → chromium build → stage）
- 仅灌 WebUI：`build-only` → `browser sync`（再按需 `apply` / `browser build`）

```powershell
pnpm --filter @i-thinking/browser build-only
pnpm browser sync
pnpm browser apply
pnpm browser build
```

运行：

```powershell
& "D:\i-thinking-browser\chromium\src\out\i-thinking\chrome.exe" `
  --user-data-dir="$env:LOCALAPPDATA\i-thinking"
```

地址栏打开：`chrome://i-thinking`  
新标签页 / 起始页「打开新标签页」走 `chrome://newtab` 改写链：企业策略 → **扩展 NTP 覆盖** → 无覆盖时才落到 `chrome://i-thinking/`。因此 Tabrr 等扩展仍可接管新标签页；产品只提供默认 fallback。无痕模式仍用系统自带新标签页。

## 首次 / 全量编译

```powershell
pnpm command browser configure          # 开发：gn/args.gn
pnpm command browser build              # autoninja chrome
```

| 场景 | 命令 / 文件 |
|------|-------------|
| 日常开发 | `browser configure` ← `gn/args.gn`（component build） |
| 发布安装包 | `browser configure --release` ← `gn/args.release.gn` + **本机** `gn/args.release.local.gn` |

编译输出目录（不在 monorepo 内）：

`D:\i-thinking-browser\chromium\src\out\i-thinking\`  

Google API 密钥与黄条说明见 [release.md](./release.md)。

## 打包运行时

```powershell
pnpm browser stage
pnpm browser pack    # 需本机 makensis → apps/browser/build/i-thinking-setup.exe
```

输出：`apps/browser/build/runtime\`（含 `i-thinking.exe`）。  
NSIS：`installer/i-thinking.nsi`（读 `build/runtime`，写出 `build/i-thinking-setup.exe`）。

## 推荐日常循环

| 你改了什么 | 做什么 |
|------------|--------|
| 仅 React / CSS | `dev` / `dev:core`；或 `build-only` + `browser sync` 后重开（HTTP 热更更快） |
| overlay C++ / patches | `browser apply` → `browser build` |
| 上游 Chromium | `browser fetch` → apply → configure → build |
| 准备给别人试 / 发布 | `pnpm --filter @i-thinking/browser build`（→ stage）；再 `browser pack` |

## 用户数据目录

| | |
|--|--|
| 产品约定 | `%LOCALAPPDATA%\i-thinking` |
| 开发建议 | `%LOCALAPPDATA%\i-thinking-dev`（与正式 profile 隔离） |

## 故障速查

| 现象 | 处理 |
|------|------|
| 找不到 `chrome.exe` | 先 `browser status`；确认 `out\i-thinking` 已编过 |
| `chrome://i-thinking` `ERR_FAILED` | 确认 `apply` 已写入 `chrome_paks.gni`，再 `build`；或先用 HTTP 热更验证前端 |
| grit / `resource_ids` 报错 | `browser apply` 的 wire 步骤会登记 `i_thinking`；见 [release.md](./release.md) |
| Apps 按钮仍进旧页 | 再跑 `browser apply` |
| 缺少 Google API 密钥黄条 | 发布用 `args.release.local.gn` + `configure --release`，见 [release.md](./release.md) |
| `atldef.h` not found | VS Installer 安装「用于最新 v143 生成工具的 C++ ATL」 |
| 编译链报 VS | 确认 VS2022 + `DEPOT_TOOLS_WIN_TOOLCHAIN=0` |

回到目录说明：[03-directories.md](./03-directories.md) · 文档首页：[README.md](./README.md)
