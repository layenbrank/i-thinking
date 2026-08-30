# Studio Sidecar（落盘目录）

二进制 **不进 Git**。工具链由根 CLI 统一管理：

```bash
pnpm command sidecar bootstrap studio
```

- 版本钉：[`scripts/commands/features/sidecar/tools.lock.json`](../../../scripts/commands/features/sidecar/tools.lock.json)
- 下载缓存：`.cache/sidecar/<tool>/<platform>/`
- 本目录仅保留 `staging/<platform>/`（Forge 打包读这里）

无需系统 7-Zip（解压用系统 `tar` / Expand-Archive / unzip）。详见根 CLI `pnpm command sidecar --help`。
