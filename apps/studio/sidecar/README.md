# Studio Sidecar（落盘目录）

二进制 **不进 Git**。工具链由根 CLI 统一管理：

```bash
pnpm command sidecar bootstrap studio   # 全量落盘（含按需工具；档位是打包侧的事）
```

- 版本钉：[`scripts/commands/features/sidecar/tools.lock.json`](../../../scripts/commands/features/sidecar/tools.lock.json)
- 下载缓存：`.cache/sidecar/<tool>/<platform>/`
- 本目录仅保留 `staging/<platform>/`（Forge 打包读这里）

**按需工具**（lock 里标 `onDemand`：pandoc / ffmpeg / opencode）照样落盘，只是名字记进
`checksums.json.onDemand` —— 「带不带进安装包」由打包档位决定（`forge/hooks/sidecar.ts`，默认精简版不带），
所以切档不用重跑 bootstrap。精简版里这三个由 Studio 运行时下载到 `<userData>/sidecar/<tool>/<版本>/`。

**corex 不参与按需下载**：它是自研 sidecar，必须随包（档位无关），版本与直链钉在 `tools.lock.json`（直链是自建 R2 镜像）。
落盘时从同一个归档里取三样：`corex-daemon`、`corex` 与 **`corex-mcp`**（opencode 等按名字拉起的侧车）。

**`manifest.json`** 是这三个工具的**在线包清单**（R2 直链 + sha256 + 解压后要留的文件名），
宿主构建期内联它、CLI 也能读它核对：

```bash
pnpm command sidecar manifest            # 打印当前平台的声明
pnpm command sidecar manifest --verify   # 下载并核 sha256
```

无需系统 7-Zip（解压用系统 `tar` / Expand-Archive / unzip）。详见根 CLI `pnpm command sidecar --help`。
