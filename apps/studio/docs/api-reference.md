# Studio API 参考

源码真相：

- [`src/plugins/itc.ts`](../src/plugins/itc.ts) — `ITC` API 形状
- [`src/plugins/channels.ts`](../src/plugins/channels.ts) — Channel 常量
- [`src/plugins/<domain>.ts`](../src/plugins/) — 手写类型 + zod（不 `z.infer`）
- [`src/preload.ts`](../src/preload.ts) — 暴露与错误转换

获取实例：

```ts
// 推荐：全局挂载（preload exposeInMainWorld('itc')）
itc.store.toRead({ key: 'locale' })

// 网页预览（dev:core）没有 preload，需自行容错
const hasItc = typeof itc !== 'undefined'
```

## 约定

### IpcResult（Main → Preload）

```ts
type IpcResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }
```

Preload `invoke`：若 `!ok`，抛出 `Error('[code] message')`。

### Channel 命名

`namespace:action`；CRUD 等与方法同名的 action 用 camelCase（如 `store:toRead`）。

---

## store

| 方法       | Channel          | 入参              | 返回                |
| ---------- | ---------------- | ----------------- | ------------------- |
| `toRead`   | `store:toRead`   | `{ key: string }` | `Promise<unknown>`  |
| `toWrite`  | `store:toWrite`  | `{ key, value }`  | `Promise<void>`     |
| `has`      | `store:has`      | `{ key }`         | `Promise<boolean>`  |
| `toRemove` | `store:toRemove` | `{ key }`         | `Promise<void>`     |
| `clear`    | `store:clear`    | 无                | `Promise<void>`     |
| `keys`     | `store:keys`     | 无                | `Promise<string[]>` |

---

## dialog

| 方法   | Channel       | 入参                              | 返回                        |
| ------ | ------------- | --------------------------------- | --------------------------- |
| `open` | `dialog:open` | 可选 `{ multiple?, filters? }`    | `Promise<string[] \| null>` |
| `save` | `dialog:save` | 可选 `{ defaultPath?, filters? }` | `Promise<string \| null>`   |

---

## user

| 方法       | Channel         | 入参      | 返回               |
| ---------- | --------------- | --------- | ------------------ |
| `toRead`   | `user:toRead`   | 无        | `Promise<ReadR[]>` |
| `toWrite`  | `user:toWrite`  | `WriteP`  | `Promise<ReadR>`   |
| `toUpdate` | `user:toUpdate` | `UpdateP` | `Promise<ReadR>`   |
| `toRemove` | `user:toRemove` | `RemoveP` | `Promise<void>`    |

`ReadR`：`{ id: string; createdAt; updatedAt; name; email }`（ISO 时间字符串）。

---

## sidecar

| 方法         | Channel               | 入参 | 返回                   |
| ------------ | --------------------- | ---- | ---------------------- |
| `findStatus` | `sidecar:find-status` | 无   | `Promise<FindStatusR>` |

`FindStatusR`：`{ isReady, version, actions, hasCorex, hasPandoc }`。

---

## doc

| 方法      | Channel       | 入参       | 返回                |
| --------- | ------------- | ---------- | ------------------- |
| `convert` | `doc:convert` | `ConvertP` | `Promise<ConvertR>` |

`format`：`markdown` \| `html` \| `docx` \| `pdf` \| `plain`。

---

## screenshot

| 方法      | Channel              | 入参 | 返回                               |
| --------- | -------------------- | ---- | ---------------------------------- |
| `capture` | `screenshot:capture` | 无   | `Promise<{ path, width, height }>` |

路径由 Main 写入 `userData/screenshots`。Corex 返回 path string 或 `{ path }`。

---

## updater

| 方法          | Channel               | 入参 | 返回                   |
| ------------- | --------------------- | ---- | ---------------------- |
| `findStatus`  | `updater:find-status` | 无   | `Promise<FindStatusR>` |
| `check`       | `updater:check`       | 无   | `Promise<CheckR>`      |
| `download`    | `updater:download`    | 无   | `Promise<void>`        |
| `install`     | `updater:install`     | 无   | `Promise<void>`        |
| `onEvent(cb)` | `updater:event`       | —    | 取消订阅函数           |

---

## devtools

| 方法       | Channel             | 入参                   | 返回            |
| ---------- | ------------------- | ---------------------- | --------------- |
| `toUpdate` | `devtools:toUpdate` | `{ visible: boolean }` | `Promise<void>` |

仅开发态。

---

## chat

会话 / 消息 / provider 仓储（Drizzle，主进程独占；渲染进程只拿元数据，apiKey 不落库）。

| 方法                | Channel                  | 入参              | 返回                       |
| ------------------- | ------------------------ | ----------------- | -------------------------- |
| `provider.toRead`   | `chat:provider.toRead`   | 无                | `Promise<ProviderReadR[]>` |
| `provider.toWrite`  | `chat:provider.toWrite`  | `ProviderWriteP`  | `Promise<ProviderReadR>`   |
| `provider.toUpdate` | `chat:provider.toUpdate` | `ProviderUpdateP` | `Promise<ProviderReadR>`   |
| `provider.toRemove` | `chat:provider.toRemove` | `{ id }`          | `Promise<void>`            |
| `session.toRead`    | `chat:session.toRead`    | 无                | `Promise<SessionReadR[]>`  |
| `session.toWrite`   | `chat:session.toWrite`   | `SessionWriteP`   | `Promise<SessionReadR>`    |
| `session.toUpdate`  | `chat:session.toUpdate`  | `SessionUpdateP`  | `Promise<SessionReadR>`    |
| `session.toRemove`  | `chat:session.toRemove`  | `{ id }`          | `Promise<void>`            |
| `message.toRead`    | `chat:message.toRead`    | `{ sessionID }`   | `Promise<MessageReadR[]>`  |
| `message.toAppend`  | `chat:message.toAppend`  | `MessageAppendP`  | `Promise<MessageReadR>`    |
| `message.toUpdate`  | `chat:message.toUpdate`  | `MessageUpdateP`  | `Promise<MessageReadR>`    |
| `message.toRemove`  | `chat:message.toRemove`  | `{ id }`          | `Promise<void>`            |

`ProviderReadR`：`{ id, kind, name, baseUrl, models: string[] | null, model, enabled, createdAt, updatedAt }`；
`models` 落库是 JSON 文本，IPC 上是数组；时间均为 ISO 字符串。

`SessionReadR`：`{ id, title, pinned, providerID, createdAt, updatedAt }`；`session.toRead` 按 `pinned`、`updatedAt` 倒序（置顶优先、其次最近活动）。

`MessageReadR`：`{ id, sessionID, parentID, format, content, createdAt, updatedAt }`。
`format` + `content` 由渲染进程的 MessageFormatAdapter（`encode()`）产出，主进程不解析；`parentID` 表达编辑/重生成分支。
`message.toAppend` 顺带推进所属会话的 `updatedAt`；删消息级联删后继分支，删会话级联删消息，删 provider 只把会话的 `providerID` 置空。

---

## assistant（离线通路）

主进程本地 provider（Ollama / LM Studio / vLLM 等 OpenAI 兼容端点）。生成过程走 **MessagePort 纯数据协议**，不是 invoke。

| 方法           | Channel                        | 入参                     | 返回                                        |
| -------------- | ------------------------------ | ------------------------ | ------------------------------------------- |
| `connect`      | `assistant:connect`            | 无                       | `Promise<void>`（建端口后由主进程推送）     |
| `onPort(cb)`   | `assistant:port`（主进程推送） | —                        | 取消订阅函数；`cb(port)` 拿到 `MessagePort` |
| `key.toWrite`  | `assistant:key.toWrite`        | `{ providerID, apiKey }` | `Promise<void>`                             |
| `key.has`      | `assistant:key.has`            | `{ providerID }`         | `Promise<boolean>`                          |
| `key.toRemove` | `assistant:key.toRemove`       | `{ providerID }`         | `Promise<void>`                             |

**端口协议**（`src/plugins/assistant-protocol.ts`，均为可结构化克隆的纯数据）：

| 方向            | 消息                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| renderer → main | `{ kind: 'start', runID, providerID, model, system?, messages: {role,content}[] }` |
| renderer → main | `{ kind: 'abort', runID }`                                                         |
| main → renderer | `{ kind: 'text' \| 'reasoning', runID, blockID, text }`                            |
| main → renderer | `{ kind: 'tool-call', runID, toolCallId, toolName, input }`                        |
| main → renderer | `{ kind: 'finish', runID, finishReason, usage }`                                   |
| main → renderer | `{ kind: 'aborted' \| 'error', runID, message? }`                                  |

约束：单条消息 ≤ 1MB（JSON 字符数）、单请求 ≤ 200 条消息、同一端口并发运行 ≤ 4；端口关闭或窗口销毁 → 该端口所有运行立即 abort。

**apiKey 不进端口、也不出主进程**：`key.toWrite` 只写、`key.has` 只答是与否，没有读回接口；系统密钥库（`safeStorage`）不可用时**拒绝保存**，不退化成明文。

---

## app

| 方法            | 传输          | 说明             |
| --------------- | ------------- | ---------------- |
| `onMessage(cb)` | `app:message` | 返回取消订阅函数 |

---

## 错误码

| code                   | 含义          |
| ---------------------- | ------------- |
| `IPC_UNTRUSTED_SENDER` | sender 未登记 |
| `IPC_INVALID_PAYLOAD`  | zod 失败      |
| `IPC_HANDLER_ERROR`    | 业务抛错      |
