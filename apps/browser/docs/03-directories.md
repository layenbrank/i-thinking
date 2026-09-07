# 03 — 目录与路径约定

本机 Chromium 相关文件统一放在工作区根下（路径由 [`config.json`](../config.json) 定义）：

```text
D:\i-thinking-browser\
  README.txt
  depot_tools\                  ← 工具链
  chromium\                     ← gclient 工作区（含 .gclient）
    src\                        ← Chromium 源码 = CHROMIUM_ROOT
      out\i-thinking\           ← 编译输出
  git-cache\                    ← git 对象缓存（可选）
```

| 变量 / 含义 | 路径 |
|-------------|------|
| 工作区根 | `D:\i-thinking-browser` |
| `DEPOT_TOOLS` | `D:\i-thinking-browser\depot_tools` |
| `CHROMIUM_CHECKOUT` | `D:\i-thinking-browser\chromium` |
| `CHROMIUM_ROOT` | `D:\i-thinking-browser\chromium\src` |
| `GIT_CACHE_PATH` | `D:\i-thinking-browser\git-cache` |

## 与 monorepo 的对应

```text
<repo>/apps/browser/                 ← Git 内
  config.json                        ← 路径与下载 URL
  src/                               ← WebUI 源码（提交）
  overlay/
    chrome/browser/ui/webui/...      ← C++ 接线（提交）
    chrome/common/...                ← URL 常量等（提交）
    chrome/browser/resources/i_thinking/
      OWNERS                         ← 提交
      *                              ← sync 生成，gitignore，不提交
  patches/、gn/、installer/、docs/
  dist/                              ← Vite 产物（gitignore）
  build/                             ← stage / pack（gitignore）
    runtime/                         ← i-thinking.exe + 依赖
    i-thinking-setup.exe
```

| 改什么 | 在哪里 |
|--------|--------|
| 产品逻辑、补丁、WebUI 源码 | `apps/browser`；日常 `build-only` + `sync`；发布 `pnpm --filter @i-thinking/browser build` |
| 编译浏览器 | `CHROMIUM_ROOT`（本机工作区）`out\i-thinking\` |
| 发布用 Google API 密钥 | 仅 `gn/args.release.local.gn`（见 [release.md](./release.md)） |
| CLI 实现 | `<repo>/scripts/commands/features/browser/` |

可用环境变量覆盖默认路径，见 [02-environment.md](./02-environment.md)。

## 下一步

→ [04-install.md](./04-install.md)
