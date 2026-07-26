# Findings & Decisions

## Overlay Caption
- Modal 用 flex 插槽（bar + body），禁止 absolute
- `Application.Caption`：最大化 / 恢复 / 关闭；`actions` 可扩展在左侧
- `caption={false}`：工作区 Utility 自带顶栏时关掉 Overlay 默认顶栏
- Utility / workspace utility 去掉 Tauri min/max/close，改为 Caption + OverlayContext

## Naming
- `isExpanded` / `onUpdateExpanded` / `expand` / `collapse` / `close`
- Context 抽到 `overlay-context.ts` 避免与 caption 循环依赖
