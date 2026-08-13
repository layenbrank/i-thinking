# i-thinking Client (Tauri)

桌面客户端，Tauri 壳层 + React 前端；重能力（PDF/morph、截图、系统扫描）经 **corex-serve** sidecar IPC 提供。

## 开发

```bash
# 在 apps/client 目录
pnpm dev          # 自动执行 prepare + vite + tauri dev
```

`beforeDevCommand` 会跑 `node scripts/prepare/index.ts`：按宿主架构准备二进制（已就绪则跳过）：

| 工具 | 来源 | 落盘 |
|------|------|------|
| corex-serve + pdfium | [layenbrank/corex v3.0.0](https://github.com/layenbrank/corex/releases/tag/v3.0.0)（目前仅 Windows x64；zip 含 CLI+sidecar+pdfium，仅落盘 serve，不落 CLI） | 源：`src-tauri/binaries/corex-serve-<triple>.exe` + `pdfium.dll`；安装后：`corex-serve.exe` 与 `pdfium.dll` 同级（resources 映射，无需 `COREX_PDFIUM_DIR`） |
| pandoc | [jgm/pandoc 3.10.1](https://github.com/jgm/pandoc/releases/tag/3.10.1) | `binaries/pandoc.exe`（`bundle.resources`，非 sidecar） |
| ffmpeg / ffprobe | [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) 静态 GPL | `binaries/ffmpeg.exe`、`ffprobe.exe`（`bundle.resources`） |

归档缓存于 `apps/client/.cache/prepare/`（已 gitignore）。下载使用 `ky`（`prepare/http.ts`），支持进度条。

**源链**（[`scripts/prepare/sources.ts`](scripts/prepare/sources.ts)）：每产物 `release` 坐标 + 有序 `sources[]`（`local` / `mirror` / `url` / `github`）。默认远端优先。本机覆盖复制 `sources.local.ts.example` → `sources.local.ts`（已 gitignore），可把 `local` 置顶。

```bash
pnpm prepare:bin --show-sources          # 查看生效源链
pnpm prepare:bin --only corex -v         # 详细日志
```

| 标志 / 环境变量 | 作用 |
|-----------------|------|
| （默认） | 已就绪则跳过；按 `sources.ts` 源链取源 |
| `--force` | 非交互强制覆盖（可配合 `--only`） |
| `--only <ids>` | 仅处理指定产物（如 `corex` 或 `corex,pandoc`） |
| `--ask` | TTY 勾选要覆盖的已落盘产物（勿与 `--force` 同用） |
| `--force-remote` | 跳过源链中的 `local`，仅走远端 |
| `--show-sources` | 打印生效源链后退出 |
| `--strict` | 可选产物失败也退出 |
| `-v, --verbose` | 详细下载 / 缓存 / 源链日志 |
| `PREPARE_MIRRORS` | **已弃用**：注入为 `mirror` 并警告；请改 `sources*.ts` |

二次执行会对照 Release [`SHA256SUMS.txt`](https://github.com/layenbrank/corex/releases/download/v3.0.0/SHA256SUMS.txt) 校验。本地 `binaries/SHA256SUMS` 仅 remap 文件名供 CI。

## Rust 检查 / 构建

`cargo check` / `cargo build` 前需确保 sidecar 二进制存在（Tauri build script 会校验路径）：

```bash
# 在 apps/client 目录
pnpm prepare:bin        # node scripts/prepare/index.ts
pnpm check:tauri        # prepare + cargo check
```

本地 corex 开发：复制 `sources.local.ts.example`，设置 `CARGO_TARGET_DIR`，将 `local` 源置顶。仅远端时不要创建 local 覆盖，或加 `--force-remote`：

```bash
# Windows 示例
set CARGO_TARGET_DIR=D:\Documents\Rust\corex\master\target
copy scripts\prepare\sources.local.ts.example scripts\prepare\sources.local.ts
node scripts/prepare/index.ts --only corex

# 本轮跳过 local
node scripts/prepare/index.ts --force-remote --only corex
```

若本地与下载都不可用，prepare **直接报错退出**（不再使用占位二进制）。

## 打包

```bash
# 1. 准备真实 sidecar（下载 Release，或设置 CARGO_TARGET_DIR）
cd apps/client
node scripts/prepare/index.ts --strict

# 2. 打包（build 会注入空签名密码）
pnpm build
```

prepare：corex 始终必需。源链见 `scripts/prepare/sources.ts`。`--force` / `--only` / `--ask` / `--force-remote` / `--show-sources` / `--strict` 见上表。

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
