# 05 — 如何更新

分三类更新，不要混用。仓库 CLI：`pnpm command browser`（别名 `pnpm browser`）。

扩展：新子命令 → `scripts/commands/features/browser/actions` + `catalog.ts`；接线步骤 → `wire/`；GN 档 → `profiles/`。

## A. 更新 depot_tools（工具链）

频率：低（工具坏了、Chromium 文档要求升级时）。

```powershell
# 方式 1：删掉工具链目录后重装（最干净）
Remove-Item -Recurse -Force D:\i-thinking-browser\depot_tools
pnpm command browser bootstrap

# 方式 2：换归档 URL 后重跑 bootstrap（见 config.json → urls.depotToolsArchive）
```

说明：当前默认 `DEPOT_TOOLS_UPDATE=0`，**不会**静默改你的工具链目录。

## B. 更新 Chromium 源码（跟版）

频率：按 milestone 计划（见 [release.md](./release.md)）。

```powershell
pnpm command browser fetch
```

等价于在 `D:\i-thinking-browser\chromium` 下执行 `gclient sync`（带 `--nohooks --no-history`）。

### 钉到某一里程碑

```powershell
cd D:\i-thinking-browser\chromium\src
git fetch --tags
git checkout <tag或分支>    # 以 chrome/VERSION / 官方 tag 为准
cd ..
gclient sync --with_branch_heads --with_tags
```

然后把版本写进 `apps/browser/config.json` → `chromiumMilestone`。

### 跟版后必做

```powershell
pnpm command browser apply      # overlay + wire（含 chrome_paks）
pnpm command browser configure
# 若编发布包：
pnpm command browser configure --release
pnpm command browser build
```

冲突高发目录见 [release.md](./release.md)。

## C. 更新产品 WebUI / 补丁（日常）

只改 `apps/browser` 时（含 **git pull 之后**——资源目录不进仓库）：

```powershell
# 完整发布（推荐与 package.json build 一致）
pnpm --filter @i-thinking/browser build

# 或仅 WebUI + 开发档增量编
pnpm --filter @i-thinking/browser build-only
pnpm browser sync
pnpm browser apply
pnpm browser build
```

纯前端热更（不重编 C++）：见 [06-develop-run.md](./06-develop-run.md)。

## 更新检查清单

1. `pnpm command browser status` — 源码 / exe 是否还在  
2. `git -C D:\i-thinking-browser\chromium\src status` — 是否有未提交的手工改动  
3. 备份或导出补丁：`pnpm command browser export-patches`  
4. sync → apply → configure → build → 冒烟打开 `chrome://i-thinking`

## 下一步

→ [06-develop-run.md](./06-develop-run.md)
