# Electron postinstall 卡住 — 问题排查与解决记录

> 记录时间：2026-07-13  
> 环境：Windows 10、Node v24.11.0、pnpm 11.11.0、electron 40.10.2

## 现象

执行 `pnpm build:client`（或任意触发全量 `pnpm install` 的命令）时，安装过程长时间卡在：

```
.../node_modules/electron postinstall$ node install.js
```

- 可持续 **30 分钟以上**无输出
- 手动 `Ctrl+C` 后退出码为 `3221225786`
- 最终报错：`Command failed with exit code 3221225786`

`build:client` 本身使用 **Tauri**，并不直接依赖 Electron；卡住是因为 monorepo 全量安装时仍会构建 `apps/studio` 所需的 `electron` 包。

## 错误日志摘要

```
node_modules/.pnpm/electron@40.10.2/node_modules/electron: Running postinstall script, failed in 30m 1.9s
.../node_modules/electron postinstall$ node install.js
│ ^C
└─ Failed in 30m 1.9s
[ELIFECYCLE] Command failed with exit code 3221225786.
```

## 根因

### 1. Electron postinstall 在下载二进制

`electron` 的 `postinstall` 执行 `install.js`，内部通过 `@electron/get` 的 `downloadArtifact()` 下载平台对应的 zip（Windows 约 **138 MB**）。

### 2. 未使用国内镜像时走 GitHub 源

运行时证据（`DEBUG=@electron/get:index`）：

**无镜像配置时：**

```
Checking the cache for electron-v40.10.2-win32-x64.zip
  (https://github.com/electron/electron/releases/download/v40.10.2/electron-v40.10.2-win32-x64.zip)
Cache miss
Downloading https://github.com/electron/electron/releases/download/...
```

下载启动后长时间无进展，表现为「卡住」。

**设置 `ELECTRON_MIRROR` 后：**

```
Checking the cache for electron-v40.10.2-win32-x64.zip
  (https://npmmirror.com/mirrors/electron/v40.10.2/electron-v40.10.2-win32-x64.zip)
Cache hit
```

数秒内完成。

### 3. `.npmrc` 中的 `electron_mirror` 在 pnpm 11 下不生效

项目 `.npmrc` 已配置：

```ini
electron_mirror=https://npmmirror.com/mirrors/electron/
```

但 `@electron/get` 读取镜像的顺序为（见 `artifact-utils.js`）：

1. `process.env.npm_config_electron_mirror`
2. `process.env.ELECTRON_MIRROR`
3. `package.json` 中 `config.electron_mirror`（即 `npm_package_config_electron_mirror`）

**pnpm 11 的重要变更：**

- 生命周期脚本中**不再**将 `.npmrc` 配置注入为 `npm_config_*` 环境变量
- 参考：[pnpm 11.0 发布说明](https://pnpm.io/blog/releases/11.0)、[pnpm Scripts 文档](https://pnpm.io/scripts)

实测 `pnpm run` 时：

```json
{
  "npm_config_electron_mirror": undefined,
  "ELECTRON_MIRROR": undefined
}
```

因此 `.npmrc` 里的 `electron_mirror` 对 `electron` 的 postinstall **无效**，脚本回退到 GitHub 官方地址。

### 4. 用户自定义环境变量仍会被保留

pnpm 11 会保留用户**主动设置**的环境变量（如 `ELECTRON_MIRROR`），只是不再从 `.npmrc` 自动注入。

## 依赖关系说明

| 包 / 应用 | 是否依赖 electron |
|-----------|-------------------|
| `apps/client`（Tauri） | 否 |
| `apps/studio`（Electron Forge） | 是 |
| 根 `package.json` devDependencies | 是（`"electron": "catalog:"`） |

全量 `pnpm install` 会安装并构建所有 workspace 包，因此即使用 `build:client` 也会触发 `electron` postinstall。

## 当前项目采用的方案：pnpm patch

已通过 pnpm patch 在 `electron@40.10.2` 的 `install.js` 中注入默认镜像：

```js
const ELECTRON_MIRROR_URL = 'https://npmmirror.com/mirrors/electron/';
if (!process.env.ELECTRON_MIRROR && !process.env.npm_config_electron_mirror) {
  process.env.ELECTRON_MIRROR = ELECTRON_MIRROR_URL;
}
```

相关文件：

| 文件 | 说明 |
|------|------|
| `patches/electron@40.10.2.patch` | patch 内容 |
| `pnpm-workspace.yaml` → `patchedDependencies` | patch 注册 |
| `.npmrc` | 保留 `electron_mirror` 配置并附注 pnpm 11 行为变更 |

**优点：** 团队克隆仓库后 `pnpm install` 自动生效，无需每人配环境变量。  
**注意：** electron 升级版本后需重新 `pnpm patch electron@<新版本>` 并更新 patch 文件。

## 其他可选方案（不使用 patch）

### 方案 A：设置环境变量（最简单）

**PowerShell（当前会话）：**

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
pnpm install
```

**永久（用户级）：**

```powershell
[System.Environment]::SetEnvironmentVariable(
  "ELECTRON_MIRROR",
  "https://npmmirror.com/mirrors/electron/",
  "User"
)
```

### 方案 B：缩小安装范围（仅构建 client）

```powershell
pnpm install --filter @i-thinking/client...
pnpm build:client
```

不安装 studio 相关依赖，可完全避开 electron postinstall。

### 方案 C：packageExtensions 注入 config

在 `pnpm-workspace.yaml` 添加：

```yaml
packageExtensions:
  electron@*:
    config:
      electron_mirror: https://npmmirror.com/mirrors/electron/
```

依赖 `npm_package_config_electron_mirror` 在 postinstall 上下文中可用；需在目标环境实测验证。

### 方案 D：跳过二进制下载（不需要 studio 时）

```powershell
$env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
pnpm install
```

studio 将无法运行。

### 方案 E：降级 pnpm 到 v9/v10

pnpm 10 及以前会将 `.npmrc` 的 `electron_mirror` 注入为 `npm_config_electron_mirror`，现有 `.npmrc` 可直接生效。需同步修改 `packageManager` 字段并评估团队迁移成本。

### 方案 F：包装安装脚本

```json
{
  "scripts": {
    "install:deps": "cross-env ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ pnpm install"
  }
}
```

需改用 `pnpm run install:deps`，直接 `pnpm install` 仍会卡住。

## 方案对比

| 方案 | 改动量 | 可靠性 | 适用场景 |
|------|--------|--------|----------|
| 环境变量 | 无 | 高 | 个人开发、CI |
| pnpm patch（当前） | 中 | 高 | 团队零配置 |
| filter 安装 | 小 | 高 | 只构建 client |
| packageExtensions | 小 | 中 | 不想 patch 时尝试 |
| 降级 pnpm | 中 | 高 | 继续依赖 `.npmrc` |
| 包装脚本 | 小 | 高 | 可接受改安装习惯 |

## 验证方法

### 1. 检查 electron 二进制是否安装成功

```powershell
Test-Path "node_modules\.pnpm\electron@40.10.2\node_modules\electron\dist\electron.exe"
# 应返回 True
```

### 2. 观察 postinstall 使用的下载地址

```powershell
$env:DEBUG = "@electron/get:index"
Remove-Item -Recurse -Force "node_modules\.pnpm\electron@40.10.2\node_modules\electron\dist" -ErrorAction SilentlyContinue
pnpm rebuild electron
```

正常应看到 `npmmirror.com` 而非 `github.com/electron/electron/releases/download`。

### 3. 完整安装耗时参考

- **有问题：** postinstall 30 分钟无响应
- **修复后：** 通常数秒到数十秒（视缓存情况而定）

## 相关源码位置

```
node_modules/.pnpm/electron@40.10.2/node_modules/electron/install.js   # postinstall 入口
node_modules/.pnpm/@electron+get@2.0.3/node_modules/@electron/get/dist/cjs/artifact-utils.js  # 镜像 URL 解析
```

`mirrorVar()` 关键逻辑：

```js
process.env.npm_config_electron_mirror ||
process.env.ELECTRON_MIRROR ||
options.mirror ||
'https://github.com/electron/electron/releases/download/'  // 默认回退
```

## 后续维护清单

- [ ] electron 版本升级后，检查 `patchedDependencies` 是否需更新
- [ ] 若移除 patch，确保团队统一配置 `ELECTRON_MIRROR` 或采用其他方案
- [ ] CI 流水线建议显式设置 `ELECTRON_MIRROR` 环境变量作为双保险
- [ ] 评估是否将根 `package.json` 中的 `electron` 仅保留在 `apps/studio`，减少无关安装

## 参考链接

- [npmmirror Electron 镜像说明](https://npmmirror.com/mirrors/electron/)
- [pnpm 11.0 发布说明](https://pnpm.io/blog/releases/11.0)
- [pnpm Scripts / 环境变量](https://pnpm.io/scripts)
- [@electron/get artifact-utils 源码](https://github.com/electron/get/blob/main/src/artifact-utils.ts)
