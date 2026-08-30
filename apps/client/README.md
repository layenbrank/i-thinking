# i-thinking Client (Tauri)

桌面客户端，Tauri 壳层 + React 前端；重能力经 **corex-daemon** sidecar IPC 提供。

## 开发

```bash
# 在 apps/client 目录
pnpm dev          # prepare:bin + tauri dev
```

`prepare:bin` / `beforeDevCommand` 调用根 CLI：

```bash
pnpm command sidecar bootstrap client
```

| 工具 | 落盘（`src-tauri/binaries/`） |
|------|------------------------------|
| corex-daemon + pdfium | `corex-daemon-<host-triple>[.exe]`、`pdfium.dll` |
| pandoc | `pandoc[.exe]` |
| ffmpeg / ffprobe | `ffmpeg` / `ffprobe` |

版本钉：[`scripts/commands/features/sidecar/tools.lock.json`](../../scripts/commands/features/sidecar/tools.lock.json)  
下载缓存：`.cache/sidecar/<tool>/<platform>/`（仓库根）

单项下载：`pnpm command sidecar corex|pandoc|ffmpeg`（再 `pnpm command sidecar stage client`）。

## Rust 检查 / 构建

```bash
pnpm prepare:bin
pnpm check:tauri
```

## 打包

```bash
pnpm prepare:bin
pnpm build
```
