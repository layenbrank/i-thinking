# i-thinking Client (Tauri)

桌面客户端，Tauri 壳层 + React 前端；重能力（PDF/morph、截图、系统扫描）经 **corex-serve** sidecar IPC 提供。

## 开发

```bash
# 在 apps/client 目录
pnpm dev          # 自动执行 copy-corex-serve + vite + tauri dev
```

## Rust 检查 / 构建

`cargo check` / `cargo build` 前需确保 sidecar 二进制存在（Tauri build script 会校验路径）：

```bash
# 在 apps/client 目录
pnpm prepare:sidecar    # node scripts/copy-corex-serve.mjs
pnpm check:tauri        # prepare:sidecar + cargo check
```

真实 corex-serve 构建后，可设置环境变量指向产物：

```bash
# Windows 示例
set COREX_ROOT=D:\Documents\Rust\corex\master
set COREX_SERVE=D:\path\to\corex-serve.exe
node scripts/copy-corex-serve.mjs
```

未设置时脚本会复制系统占位二进制（`cmd.exe` / `/bin/true`），**仅能通过编译，IPC 在运行时不可用**；应用启动后会提示「corex 未就绪」，但主窗口仍可打开。

## 打包

```bash
# 1. 构建 corex sidecar（含 pdfium）
cd D:/Documents/Rust/corex/master
cargo build -p corex-serve --release

# 2. 复制 sidecar + pdfium.dll
cd apps/client
set COREX_ROOT=D:/Documents/Rust/corex/master
node scripts/copy-corex-serve.mjs

# 3. 打包（--strict 禁止占位 sidecar 进入 release）
pnpm tauri build
```

`beforeBuildCommand` 会自动执行 `copy-corex-serve.mjs --strict`；若 corex-serve 不存在则打包失败。

## 平台说明

- **IPC（Named Pipe）**：当前仅 Windows 桌面启用 corex-serve sidecar
- **macOS / Linux**：可编译，但 morph、截图、`os` 扫描等 IPC 能力不可用

## IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
