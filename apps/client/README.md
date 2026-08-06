# i-thinking Client (Tauri)

桌面客户端，Tauri 壳层 + React 前端；重能力（PDF/morph、截图、系统扫描）经 **corex-serve** sidecar IPC 提供。

## 开发

```bash
# 在 apps/client 目录
pnpm dev          # 自动执行 prepare + vite + tauri dev
```

`beforeDevCommand` 会跑 `bun run scripts/prepare.ts`：按宿主架构从 GitHub Release 下载并解压：

| 工具 | 来源 | 落盘 |
|------|------|------|
| corex-serve + pdfium | [layenbrank/corex v2.1.1](https://github.com/layenbrank/corex/releases/tag/v2.1.1)（目前仅 Windows x64；zip 含 CLI+sidecar+pdfium，仅落盘 serve，不落 CLI） | 源：`src-tauri/binaries/corex-serve-<triple>.exe` + `pdfium.dll`；安装后：`corex-serve.exe` 与 `pdfium.dll` 同级（resources 映射，无需 `COREX_PDFIUM_DIR`） |
| pandoc | [jgm/pandoc 3.10.1](https://github.com/jgm/pandoc/releases/tag/3.10.1) | `binaries/pandoc.exe`（`bundle.resources`，非 sidecar） |
| ffmpeg / ffprobe | [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) 静态 GPL | `binaries/ffmpeg.exe`、`ffprobe.exe`（`bundle.resources`） |

归档缓存于 `apps/client/.cache/prepare/`（已 gitignore）。二次执行会对照 Release [`SHA256SUMS.txt`](https://github.com/layenbrank/corex/releases/download/v2.1.1/SHA256SUMS.txt) 校验落盘哈希；不匹配或 `--force` 时重下 sidecar。本地 `binaries/SHA256SUMS` 仅 remap 文件名供 CI。

## Rust 检查 / 构建

`cargo check` / `cargo build` 前需确保 sidecar 二进制存在（Tauri build script 会校验路径）：

```bash
# 在 apps/client 目录
pnpm prepare:bin        # bun run scripts/prepare.ts
pnpm check:tauri        # prepare + cargo check
```

可选：本地 corex 开发时用 `CARGO_TARGET_DIR` **覆盖**远端下载（优先复制 release 产物）：

```bash
# Windows 示例（指向 Cargo target 目录）
set CARGO_TARGET_DIR=D:\Documents\Rust\corex\master\target
bun run scripts/prepare.ts
```

若本地与下载都不可用，`prepare.ts` **直接报错退出**（不再使用 `cmd.exe` 等占位二进制）。

## 打包

```bash
# 1. 准备真实 sidecar（下载 Release，或设置 CARGO_TARGET_DIR）
cd apps/client
bun run scripts/prepare.ts --strict

# 2. 打包（build 会注入空签名密码）
pnpm build
```

`prepare.ts`：corex 始终必需。`--strict` 时 pandoc / ffmpeg 失败也会退出。

本地发版：

```bash
pnpm build   # 或仓库根：pnpm build:client
```

私钥用系统/终端 `TAURI_SIGNING_PRIVATE_KEY`；`scripts/build.ts` 会设 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`。

## CI 发版（stable / alpha / beta / rc）

详见仓库根 [`markdown/ops/ci-cd.md`](../../markdown/ops/ci-cd.md)。摘要：

```bash
# 仓库根：仅 bump client（apps/client/bump.client.ts）
pnpm bump:client 1.2.0-beta.1
git add apps/client/package.json apps/client/src-tauri/tauri.conf.json apps/client/src-tauri/Cargo.toml
git commit -m "chore(release): 1.2.0-beta.1"
git tag v1.2.0-beta.1 && git push origin HEAD && git push origin v1.2.0-beta.1
```

更换 sidecar：`pnpm prepare:bin` 会准备二进制并重写 `src-tauri/binaries/SHA256SUMS`（仅含 corex sidecar + pdfium）；请将二者一并提交。CI 只校验清单。pandoc / ffmpeg / ffprobe 由 `bundle.resources` 打进安装包，不进 SHA256SUMS、不建议提交。

## 平台说明

- **IPC（Named Pipe）**：当前仅 Windows 桌面启用 corex-serve sidecar
- **macOS / Linux**：可编译，但 morph、截图、`os` 扫描等 IPC 能力不可用；BtbN FFmpeg 无 macOS 资产时 prepare 会 warn 并跳过

## IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
