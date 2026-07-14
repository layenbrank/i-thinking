# pnpm 11 项目配置迁移说明

> 对齐 [pnpm 11.0](https://pnpm.io/zh/blog/releases/11.0)～[11.10](https://pnpm.io/zh/blog/releases/11.10)  
> 执行时间：2026-07-14

## 配置职责

| 位置 | 用途 |
|------|------|
| `.npmrc` | **仅** `registry` / 认证（token 勿提交仓库） |
| `pnpm-workspace.yaml` | linker、提升、`allowBuilds`、`registries`、catalog、overrides、Node 镜像等 |
| 环境变量 | Electron / native 二进制镜像（如 `ELECTRON_MIRROR`）；CI 认证可用 `pnpm_config__auth`（11.10+） |

## 已完成的优化

1. 将原 `.npmrc` 中的 `node-linker`、`shamefully-hoist`、`hoist-pattern`、`public-hoist-pattern`、`strict-peer-dependencies`、`auto-install-peers` 迁入 `pnpm-workspace.yaml`（camelCase）。
2. 删除无效的 `onlyBuiltDependencies` / `.npmrc` 的 `only-built-dependencies[]`，统一使用 `allowBuilds`（并补上 `@prisma/client`）。
3. 增加 `registries.default`（npmmirror）与 `nodeDownloadMirrors.release`。
4. 设置 `confirmModulesPurge: false`，避免布局变更时非交互安装卡住。
5. 精简 `.npmrc`：去掉对 pnpm 11 无效的 electron / sass / chromedriver 等「伪 npm 配置」行；改为注释说明环境变量。
6. 删除根 `package.json` 中 Yarn 风格的 `workspaces.nohoist`（pnpm 不读取；工作区以 `pnpm-workspace.yaml` 为准）。

## 刻意未改动的默认

| 设置 | 说明 |
|------|------|
| `minimumReleaseAge`（默认 1440） | 保留供应链保护；若需立刻装刚发的包再按需调 `0` 或 `minimumReleaseAgeExclude` |
| `blockExoticSubdeps`（默认 true） | 根目录 `overrides` 里的 `xlsx` tarball 仍可用；勿随意关闭 |
| `verifyDepsBeforeRun`（默认 install） | 运行脚本前核对依赖，利于 monorepo |

## 开发者 / CI 必设环境变量

```powershell
# Electron（否则 postinstall 可能卡在 GitHub）
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 可选：electron-builder 二进制
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
```

详见 [electron-pnpm-install-troubleshooting.md](./electron-pnpm-install-troubleshooting.md)。

## 参考

- [pnpm 11.0 发布说明](https://pnpm.io/zh/blog/releases/11.0)
- [pnpm 11.10（CI `_auth`）](https://pnpm.io/zh/blog/releases/11.10)
- [设置文档](https://pnpm.io/zh/settings)
- [认证 / .npmrc](https://pnpm.io/zh/npmrc)
