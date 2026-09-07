# 04 — 首次安装（下载地址 + 步骤）

## 下载地址

| 组件 | 地址 | 说明 |
|------|------|------|
| depot_tools 完整归档 | https://chromium.googlesource.com/chromium/tools/depot_tools/+archive/HEAD.tar.gz | `browser bootstrap` 默认 |
| depot_tools 仓库 | https://chromium.googlesource.com/chromium/tools/depot_tools | 上游 |
| Chromium `src` | https://chromium.googlesource.com/chromium/src.git | `fetch` / `gclient` |
| Windows 编译说明 | https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md | VS / SDK |
| CIPD 客户端 | https://chrome-infra-packages.appspot.com/client?platform=windows-amd64 | 工具链依赖 |

亦见 [`../config.json`](../config.json) 的 `urls` 字段。

## 安装步骤

### 0. 准备

确认 [02-environment.md](./02-environment.md)，monorepo 根目录可运行 `pnpm`。

### 1. 安装 depot_tools

```powershell
pnpm command browser bootstrap
```

安装到 `D:\i-thinking-browser\depot_tools`。

### 2. 拉取 Chromium

```powershell
pnpm command browser fetch
```

- 目标：`D:\i-thinking-browser\chromium\src`
- 体积大、耗时长
- 成功标志：存在 `BUILD.gn`

### 3. 查看状态

```powershell
pnpm command browser status
```

### 4. 接入产品并编译

`resources/i_thinking` 的 WebUI 快照不在 Git 中。完整发布：

```powershell
pnpm --filter @i-thinking/browser build
# → vite → sync → apply → configure --release → chromium build → stage
```

或分步（与上等价）：

```powershell
pnpm --filter @i-thinking/browser build-only
pnpm browser sync
pnpm browser apply
pnpm browser configure --release
pnpm browser build
pnpm browser stage
```

产物：`D:\i-thinking-browser\chromium\src\out\i-thinking\chrome.exe`

发布构建（编入 Google API 密钥、给最终用户用）见 [release.md](./release.md) 与：

```powershell
pnpm command browser configure --release
pnpm command browser build
```

### 5. 打包运行时（可选）

```powershell
pnpm command browser stage
```

输出：`apps/browser/build/runtime\i-thinking.exe`

## 常见问题

| 现象 | 处理 |
|------|------|
| `git.bat` 找不到 | bootstrap 会生成 shim；确认已安装 Git for Windows |
| googlesource 超时 | 配置 `HTTPS_PROXY` / `HTTP_PROXY` |
| 磁盘不足 | 换更大 SSD，或改 `config.json` 的 `workspaceRoot` |
| `python3_bin_reldir.txt` 缺失 | 再跑 `browser bootstrap`（会执行 `win_tools.bat`） |
| `atldef.h` not found | 安装 VS「C++ ATL」（见 [02-environment.md](./02-environment.md)） |
| 缺少 Google API 密钥黄条 | 见 [release.md](./release.md)；开发可用环境变量 |

## 下一步

→ [05-update.md](./05-update.md) · [06-develop-run.md](./06-develop-run.md)
