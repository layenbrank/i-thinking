# Findings: AI 存储模块

## 审查发现（实施前）

1. **消息未按 session 隔离** — overlay bubbles / transferMSG 使用全库 messages
2. **无启动 hydration** — store 注释掉 DB 调用，重启丢数据
3. **session$ 双源状态** — JSX 直接读 session$.value 可能不重渲染
4. **overlay/countdown Service** — legacy read/write，新 ai 模块用 to*

## 参考

- Entity/Service 模式：reminder
- Extension Dexie：AiSession / AiMessage / AiCollection
- Shared 类型：packages/shared/src/types/magnetic-tile-intelligence.d.ts
