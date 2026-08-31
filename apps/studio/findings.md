# Findings & Decisions

## Requirements
- 破坏性去兼容：无 legacy shim
- 企业级分层：shared / main / preload / renderer / forge
- 旧 architecture.md 不作验收标准；实施后按计划重写

## Research Findings
- shared/ipc/studio.ts 从 @main/modules/*/schemas 拉类型 → 依赖倒置
- CorexHost 双轨 API（invoke / findModules / hasModule / mapLegacy*）无业务调用方
- screenshot.record* 全链恒失败
- SidecarStatus.modules 实为 actions
- ESLint 缺 shared 进程边界

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| schemas → shared/ipc/&lt;domain&gt;.ts | IPC 契约单源；main 只留实现 |
| modules → actions | 字段名与 corex 语义一致 |
| capture 响应仅 path string 或 { path } | 去掉多形状兜底 |
| Studio ↔ CHANNELS ↔ preload 契约测试 | 防表面漂移 |
