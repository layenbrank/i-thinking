# @i-thinking/browser

Chromium fork 产品包（品牌 **i-thinking**）。  
与 Electron 应用 `apps/studio` 分离：浏览器能力在本目录演进。

| | |
|--|--|
| 产品 WebUI | `chrome://i-thinking` |
| 本机工作区 | `D:\i-thinking-browser\` |
| 本仓库角色 | 补丁、WebUI 源码、文档（**不含** Vite / stage 产物） |
| CLI | `pnpm command browser`（`scripts/commands/features/browser`） |

## 结构关系

```text
monorepo/apps/browser          ← 产品代码与补丁
        │  apply / sync
        ▼
D:\i-thinking-browser\         ← 本机工具链 + Chromium 源码
  depot_tools\
  chromium\src\
```

完整说明从 **[docs/README.md](./docs/README.md)** 阅读。

## 拉取 monorepo 之后（已有 Chromium 工作区）

`overlay/.../resources/i_thinking/` 下的 html/css/js/`BUILD.gn` **不进 Git**。完整发布构建（含 Chromium release + stage）：

```powershell
# 仓库根 — 耗时长，等同 client 的「产品 build」
pnpm install
pnpm --filter @i-thinking/browser build
```

仅刷新 WebUI 进源码树（不重编整个 Chromium release）：

```powershell
pnpm --filter @i-thinking/browser build-only
pnpm browser sync
pnpm browser apply
pnpm browser build
```

## 快速上手（本机尚无 Chromium）

1. 环境：[docs/02-environment.md](./docs/02-environment.md)  
2. `pnpm browser bootstrap`  
3. `pnpm browser fetch`  
4. `pnpm --filter @i-thinking/browser build`（发布全流程；首次也可用 `configure` 开发档分步编）  
5. 细节：[docs/04-install.md](./docs/04-install.md) · [docs/06-develop-run.md](./docs/06-develop-run.md)

## 常用命令

```powershell
pnpm browser status
pnpm --filter @i-thinking/browser dev
pnpm --filter @i-thinking/browser build-only   # 仅 Vite → dist/
pnpm --filter @i-thinking/browser build        # 发布：vite→sync→apply→configure --release→chromium build→stage
pnpm browser sync
pnpm browser apply
pnpm browser configure
pnpm browser configure --release
pnpm browser build
pnpm browser stage
pnpm browser pack
```

路径配置：[`config.json`](./config.json)  
发布密钥：[`docs/release.md`](./docs/release.md)（`gn/args.release.local.gn`，勿提交）
