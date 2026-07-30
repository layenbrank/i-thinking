# i-thinking Client (Tauri)

桌面客户端，Tauri 壳层 + React 前端；重能力（PDF/morph、截图、系统扫描）经 **corex-serve** sidecar IPC 提供。

## 开发

```bash
# 在 apps/client 目录
pnpm dev          # 自动执行 prepare + vite + tauri dev
```

## Rust 检查 / 构建

`cargo check` / `cargo build` 前需确保 sidecar 二进制存在（Tauri build script 会校验路径）：

```bash
# 在 apps/client 目录
pnpm prepare:bin        # bun run scripts/prepare.ts
pnpm check:tauri        # prepare + cargo check
```

真实 corex-serve 构建后，从 `CARGO_TARGET_DIR` 复制 release 产物：

```bash
# Windows 示例（指向 Cargo target 目录）
set CARGO_TARGET_DIR=D:\Documents\Rust\corex\master\target
bun run scripts/prepare.ts
```

未找到二进制时脚本会复制系统占位文件（`cmd.exe` / `/bin/true`），**仅能通过编译，IPC 在运行时不可用**；应用启动后会提示「corex 未就绪」，但主窗口仍可打开。

## 打包

```bash
# 1. 构建 corex sidecar（含 pdfium）
cd D:/Documents/Rust/corex/master
cargo build -p corex-serve --release

# 2. 复制 sidecar + pdfium.dll
cd apps/client
set CARGO_TARGET_DIR=D:/Documents/Rust/corex/master/target
bun run scripts/prepare.ts --strict

# 3. 打包（build 会注入空签名密码）
pnpm build
```

`prepare.ts --strict` 禁止占位 sidecar；若 corex-serve 不存在则失败。

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

更换 sidecar：`pnpm prepare:bin`（设置 `CARGO_TARGET_DIR`）会复制二进制并重写 `src-tauri/binaries/SHA256SUMS`；请将二者一并提交。CI 只校验清单。

## 平台说明

- **IPC（Named Pipe）**：当前仅 Windows 桌面启用 corex-serve sidecar
- **macOS / Linux**：可编译，但 morph、截图、`os` 扫描等 IPC 能力不可用

## IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
