# default capability 权限说明

> 注意：capabilities/\*.json 必须是严格 JSON，不能写注释。此文件用于说明权限用途与影响。

## 设计目标

- 保持「开发期最大权限开放」
- 通过减少重复/过长规则，降低 Tauri 上下文生成时的递归深度，避免栈溢出

## 关键策略

1. **文件系统（fs）**
   - 使用 `fs:default` 结合路径白名单（$APPDATA/$HOME/$DOCUMENTS 等）开放常用目录。
   - 仅保留核心读写/创建/删除/监控等操作的权限，去掉大量 `*-meta` 与 `*-recursive` 细项，避免超长规则列表。

2. **插件权限统一使用 default**
   - 将 `websocket/dialog/shell/store/process/positioner/notification/clipboard-manager/log/global-shortcut/sql` 等细粒度 allow 列表合并为各自的 `*:default`。
   - `http` 仅保留 `http:default`（已包含通配 URL 的 allow 列表）。

3. **核心能力（core:webview/core:window）**
   - 保留原有 `core:webview:*` 与 `core:window:*` 的显式权限，确保 UI 与窗口控制功能完整。

## 当前保留的“最大化”权限范围

- **文件系统**：读/写/创建/删除/移动/监控/遍历/统计等
- **网络**：HTTP/WebSocket 全面开放（通配 URL）
- **Shell**：执行/打开/启动等（default）
- **剪贴板/通知/全局快捷键/SQL/进程控制**：默认开放

如需进一步扩展或收敛权限，可在默认列表基础上增删条目。
