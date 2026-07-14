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

按 [pnpm 11.0](https://pnpm.io/zh/blog/releases/11.0)：

- **项目 `.npmrc` 仅用于注册源 / 认证**；提升、linker、`allowBuilds` 等一律放在 `pnpm-workspace.yaml`
- 生命周期脚本**不再**注入 `npm_config_*`（与 Yarn 对齐）
- 项目内 `.npmrc` / `pnpm-workspace.yaml` 的 `${ENV}` **也不再展开**（安全变更，见 11.5.3+）

`@electron/get` 读取镜像顺序：

1. `process.env.npm_config_electron_mirror`
2. `process.env.ELECTRON_MIRROR`
3. `package.json` 的 `config.electron_mirror`

因此必须在本机 / CI 设置 **`ELECTRON_MIRROR`**，不能把镜像指望写在仓库 `.npmrc`。

### 4. 用户自定义环境变量仍会被保留

pnpm 11 会保留用户**主动设置**的环境变量（如 `ELECTRON_MIRROR`），只是不再从 `.npmrc` 自动注入。

## 依赖关系说明

| 包 / 应用 | 是否依赖 electron |
|-----------|-------------------|
| `apps/client`（Tauri） | 否 |
| `apps/studio`（Electron Forge） | 是 |
| 根 `package.json` devDependencies | 是（`"electron": "catalog:"`） |

全量 `pnpm install` 会安装并构建所有 workspace 包，因此即使用 `build:client` 也会触发 `electron` postinstall。

## 当前项目采用的方案：环境变量 `ELECTRON_MIRROR`

按 [pnpm 11.0](https://pnpm.io/zh/blog/releases/11.0)：**`.npmrc` 仅用于认证/注册源**，生命周期脚本也不再注入 `npm_config_*`。因此改为在系统/CI 设置：

```powershell
# 用户级（永久，新开终端后生效）
[System.Environment]::SetEnvironmentVariable(
  "ELECTRON_MIRROR",
  "https://npmmirror.com/mirrors/electron/",
  "User"
)
```

**运行时证据（2026-07-14）：**

- 用户级已设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
- `pnpm install` 中 electron postinstall 日志：
  - `Checking the cache ... (https://npmmirror.com/mirrors/electron/v40.10.2/...)`
  - `Cache hit` → `Done`（约数秒，整次 install ~28s）
- **未**走 `github.com/electron/electron/releases`

**注意：** 若在设置用户环境变量之前已打开 Cursor/终端，当前会话可能仍读不到；请新开终端，或在会话中执行：

```powershell
$env:ELECTRON_MIRROR = [Environment]::GetEnvironmentVariable('ELECTRON_MIRROR','User')
```

已放弃 pnpm patch（`patches/electron@40.10.2.patch` 已移除）。CI 需同样配置 `ELECTRON_MIRROR`。

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

- [x] 本机/用户级已设置 `ELECTRON_MIRROR`（勿依赖 `.npmrc` 的 `electron_mirror`）
- [ ] CI 流水线显式设置 `ELECTRON_MIRROR` 环境变量
- [ ] 同事新环境：设置同名用户/系统环境变量后**新开终端**再 `pnpm install`
- [ ] 评估是否将根 `package.json` 中的 `electron` 仅保留在 `apps/studio`，减少无关安装
- [ ] 若改回 patch 方案，需 `pnpm patch` + `patch-commit`，勿手写损坏的 diff

## 参考链接

- [npmmirror Electron 镜像说明](https://npmmirror.com/mirrors/electron/)
- [pnpm 11.0 发布说明](https://pnpm.io/blog/releases/11.0)
- [pnpm Scripts / 环境变量](https://pnpm.io/scripts)
- [@electron/get artifact-utils 源码](https://github.com/electron/get/blob/main/src/artifact-utils.ts)
