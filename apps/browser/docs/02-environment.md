# 02 — 环境要求

## 硬件（建议）

| 项 | 建议 |
|----|------|
| CPU | 近年 8 核+（本机 Ryzen 级可编，首次会慢） |
| 内存 | ≥ 32 GB（16 GB 勉强，易换页） |
| 磁盘 | **SSD**，工作区预留 **≥ 200 GB** 空闲（源码 + out + 缓存） |
| 系统 | Windows 10/11 x64 |

## 软件

| 软件 | 用途 |
|------|------|
| **Git for Windows** | `gclient` / `fetch` 拉代码（需 `git.bat`；脚本可自动 shim） |
| **Visual Studio 2022** | 「使用 C++ 的桌面开发」、Windows 10/11 SDK；**必须**勾选「用于最新 v143 生成工具的 C++ ATL」（缺则编译报 `atldef.h` not found） |
| **Windows SDK** | 与当前 Chromium 文档要求一致 |
| **pnpm + Node** | 构建本仓库 WebUI（`apps/browser`） |
| **长路径** | 建议开启 Windows 长路径支持 |

官方 Windows 编译说明（上游）：

https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md

## 网络

| 资源 | 说明 |
|------|------|
| `chromium.googlesource.com` | 拉 depot_tools 归档、Chromium `src` |
| `chrome-infra-packages.appspot.com` | CIPD 客户端与工具包 |
| 各类 GCS | hooks / 依赖；不稳定时需代理 |

可设置：

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY  = "http://127.0.0.1:7890"
```

## 环境变量（脚本会设默认值）

| 变量 | 含义 | 默认（见 config.json） |
|------|------|------------------------|
| `ITHINKING_BROWSER_WORKSPACE` | 本机工作区根 | `D:\i-thinking-browser` |
| `DEPOT_TOOLS` | 工具链目录 | `...\depot_tools` |
| `CHROMIUM_CHECKOUT` | gclient 根（含 `.gclient`） | `...\chromium` |
| `CHROMIUM_ROOT` | 源码树 | `...\chromium\src` |
| `GIT_CACHE_PATH` | git 缓存 | `...\git-cache` |
| `DEPOT_TOOLS_WIN_TOOLCHAIN` | `0` = 用本机 VS | `0` |
| `DEPOT_TOOLS_UPDATE` | `0` = 不自动改工具链 | `0` |
| `GOOGLE_API_KEY` 等 | 开发时注入 Google API（可选） | 见 [release.md](./release.md) |

发布安装包请把密钥写进本机 `gn/args.release.local.gn`（勿提交），不要依赖用户环境变量。

## 下一步

→ [03-directories.md](./03-directories.md)
