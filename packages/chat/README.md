# @i-thinking/chat

共享 chat 层：**领域类型 + 端口接口 + assistant-ui 适配器**。被 `apps/studio`（Electron）与 `apps/extension`（MV3）共用。

## 结构

```text
packages/chat/
└── src/
    ├── ports.ts                  # 领域类型 + 三个端口（历史 / 模型 / 目标）
    └── adapters/
        ├── thread-history.ts     # ChatHistoryPort → assistant-ui ThreadHistoryAdapter（含 withFormat）
        ├── thread-list.ts        # ChatHistoryPort → assistant-ui RemoteThreadListAdapter
        └── chat-model.ts         # ChatModelPort → assistant-ui ChatModelAdapter（增量聚合为快照）
```

## 约束

- **环境无关**：不得依赖 Node、Electron、`chrome.*`。存储/传输差异一律通过 `ports.ts` 的端口由各 app 注入。
- **包内一律相对路径导入**（同 `packages/ui`，且 tsconfig 不声明 `paths`）：app 的 `resolve.tsconfigPaths` 会用 app 自己的 tsconfig 解析所有 importer 的 `@/*`。
- **消息存储契约不可改名**：行形状为 `{ id, parent_id, format, content }`（`content` 是 `format` 对应适配器 encode 出的不透明字符串）。
  studio 侧对应 `drizzle/schema/chat.ts` 的 `chatMessage`。
- 本包只放"与后端无关"的胶水；具体存储实现对某个 app 才成立的东西（表结构、Key、传输）留在 app 内。

## 端口（`ports.ts`）

| 端口              | 谁实现           | studio 实现                         | extension 实现            |
| ----------------- | ---------------- | ----------------------------------- | ------------------------- |
| `ChatHistoryPort` | 会话与消息读写   | 主进程 IPC（Drizzle）               | Dexie                     |
| `ChatModelPort`   | 一次生成的事件流 | 主进程 MessagePort（本地 provider） | `apps/service` HTTPS 路由 |

`ChatStreamEvent` 是两个环境共用的流事件形状（`text` / `reasoning` / `tool-call` / `finish` / `aborted` / `error`）。

## 适配器要点

- `createThreadHistoryAdapter(port, findThreadID)`：
  - 内置格式 `ith/thread-message-like`（`content` 为其 JSON 载荷），供离线 `useLocalRuntime` 使用；
  - `withFormat(adapter)` 交给在线 runtime（AI SDK 格式）复用同一存储，**不要**把两种格式写进同一条会话；
  - `findThreadID` **每次调用都重新取**当前线程：runtime 会在切线程后再读，不要在构造时捕获 id。
- `createThreadListAdapter(port)`：`list/rename/initialize/delete/fetch` 已实现；`generateTitle` 用本地启发式（首条用户文本）并落库；**归档暂不支持**（`archive`/`unarchive` 抛可展示错误）。
- `createChatModelAdapter(port)`：把 `ChatStreamEvent` 增量聚合成 assistant-ui 需要的快照；V1 只处理文本与推理，工具调用待特性对齐时再开。
