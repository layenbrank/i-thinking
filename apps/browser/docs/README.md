# 文档索引

按顺序阅读即可上手。

Chromium 相关命令统一使用仓库 CLI：

```text
pnpm command browser -h
pnpm browser <子命令>
```

实现位于 `scripts/commands/features/browser/`（策略注册表：`ACTIONS` / `WIRE_STEPS` / `GN_PROFILES`）。

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [01-overview.md](./01-overview.md) | 各部分职责与关系 |
| 2 | [02-environment.md](./02-environment.md) | 硬件 / 软件 / 网络 |
| 3 | [03-directories.md](./03-directories.md) | 路径约定 |
| 4 | [04-install.md](./04-install.md) | 下载地址与安装 |
| 5 | [05-update.md](./05-update.md) | 更新工具链与源码 |
| 6 | [06-develop-run.md](./06-develop-run.md) | 开发、启动、编译、打包 |

## 专题

| 文档 | 内容 |
|------|------|
| [branding.md](./branding.md) | 品牌与 user-data 改动点 |
| [release.md](./release.md) | 跟版、补丁、**Google API 密钥**、安全边界 |
| [migration-from-studio.md](./migration-from-studio.md) | 与 `apps/studio` 的职责边界 |

## 速查

| 项 | 值 |
|----|-----|
| 工作区根 | `D:\i-thinking-browser\` |
| depot_tools | `D:\i-thinking-browser\depot_tools` |
| Chromium 源码 | `D:\i-thinking-browser\chromium\src` |
| 产品包 | `<repo>/apps/browser` |
| WebUI | `chrome://i-thinking` |
| 热更 | `http://127.0.0.1:5173/` |
| 配置 | `apps/browser/config.json` |
| CLI | `pnpm browser` / `pnpm command browser` |
| 拉代码后 | `pnpm --filter @i-thinking/browser build`（完整发布）；或 `build-only` → `sync` → `apply` → `browser build` |
| `package.json` build | 发布流水线；`build-only` / `build:core` 仅 Vite |
| stage / pack | `apps/browser/build/runtime` · `apps/browser/build/i-thinking-setup.exe` |
