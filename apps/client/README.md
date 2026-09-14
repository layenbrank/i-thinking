# i-thinking Client (Tauri)

> ⚠️ **DEPRECATED / 已废弃（2026-09）**
>
> 本应用已冻结，不再接收功能改动：桌面端全面转向 `apps/studio`（Electron），
> 扩展端由 `apps/extension`（React 重写）承接。本目录仅作**只读参考**：
>
> - 不参与仓库根聚合任务（`build` / `lint` / `unit` / `e2e` 已排除本包）
> - 共享能力不再从本包抽取实现，需要复用时按“Electron / MV3 环境差异分层”重建到 `packages/*`
> - Tailwind v4 升级后，本包 `src/styles/index.scss` 的 v3 `@tailwind` 指令已失效，**构建不再保证通过**
> - 其 `AiSession / AiMessage / AiProvider` 域实现（Rust + TS）已被 studio 的新 chat 域取代

桌面客户端，Tauri 壳层 + React 前端；重能力经 **corex-daemon** sidecar IPC 提供；Agent 可选用内置 **goose** ACP sidecar。

## 开发

侧车二进制由**仓库根**统一准备（不要在 `apps/client` 里再挂 prepare 脚本）：

```bash
# 仓库根
pnpm sidecar bootstrap client
pnpm dev:client
```

或在 `apps/client`：

```bash
pnpm dev          # tauri dev（beforeDevCommand 只起 vite）
```

| 工具                  | 落盘（`src-tauri/binaries/`）                                                    |
| --------------------- | -------------------------------------------------------------------------------- |
| corex-daemon + pdfium | `corex-daemon-<host-triple>[.exe]`、`pdfium.dll`                                 |
| goose                 | `goose-<host-triple>[.exe]`（优先本机 `goose` / `GOOSE_BINARY`，否则下 release） |
| pandoc                | `pandoc[.exe]`                                                                   |
| ffmpeg / ffprobe      | `ffmpeg` / `ffprobe`                                                             |

版本钉：[`scripts/commands/features/sidecar/tools.lock.json`](../../scripts/commands/features/sidecar/tools.lock.json)  
下载缓存：`.cache/sidecar/<tool>/<platform>/`（仓库根）

单项：`pnpm sidecar corex|goose|pandoc|ffmpeg`，再 `pnpm sidecar stage client`。

启动时 Tauri 会拉起 `goose serve --platform desktop --tls`（ACP 传输层）。设置里的供应商来自 **goose inventory**（Ollama、OpenAI 兼容、各类 CLI/ACP 等）；对话经指纹 pinning WSS 接入 goose ACP，并用 `session/set_config_option` 切换 provider+model。

## Rust 检查 / 构建

```bash
# 仓库根先准备 binaries
pnpm sidecar bootstrap client
pnpm --filter @i-thinking/client check:tauri
```

## 打包

```bash
pnpm sidecar bootstrap client
pnpm build:client
```
