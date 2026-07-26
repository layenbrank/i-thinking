# Task Plan: Overlay Caption

## Goal
Application.Overlay 插槽布局 + Caption（最大化/恢复/关闭）；Utility 组合扩展；清理重复控件。

## Current Phase
Phase 4: Verify — complete

## Phases
### Phase 1: Caption + Context + Overlay slots — complete
### Phase 2: Utility rewire — complete
### Phase 3: App cleanup — complete
### Phase 4: Verify — complete

## Decisions
| Decision | Rationale |
|----------|-----------|
| flex 插槽非 absolute | 文档流布局 |
| Caption 最右可扩展 | 应用 actions 在左 |
| Modal 语义非 Tauri | 避免关主窗口 |
