# Studio API 参考

> 架构与不变式见 [ipc-contract.md](./ipc-contract.md)；本文只列**具体接口**。

源码真相：

- [`src/shared/ipc/channels.ts`](../../../apps/studio/src/shared/ipc/channels.ts) — 48 个频道常量
- [`src/shared/ipc/specs/`](../../../apps/studio/src/shared/ipc/specs/) — 每域的 zod schema（**类型由 `z.infer` 推导，不另手写**）
- [`src/shared/ipc/api.ts`](../../../apps/studio/src/shared/ipc/api.ts) — `Api`，渲染进程可见的唯一宿主面
- [`src/host/ipc/handlers/`](../../../apps/studio/src/host/ipc/handlers/) — 主进程 handler 实现
- [`src/shared/ipc/error.ts`](../../../apps/studio/src/shared/ipc/error.ts) — 错误码词汇表与跨桥 codec
- [`src/preload.ts`](../../../apps/studio/src/preload.ts) — 暴露与解信封

获取实例：

```ts
// 推荐：全局挂载（preload exposeInMainWorld('itc')）
itc.store.toRead({ key: 'locale' })

// 网页预览（dev:core）没有预load，需自行容错
const hasItc = typeof itc !== 'undefined'
```

## 约定

### 信封（Main → Preload）

```ts
type IpcEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: {
        code: IpcErrorCode
        name: string
        message: string
        details?: unknown
        stack?: string
      }
    }
```

Preload 的 `invoke` 失败时抛 `IpcClientError`，**code 已编进 message 前缀**（`[CODE] 文本`）——
`contextBridge` 会丢弃自定义属性，渲染侧只能用 `src/utils/ipc.errors.ts` 的
`toIpcFailure` / `toIpcMessage` 还原。

### Channel 命名

`namespace:action`；CRUD 等与方法同名的 action 用 camelCase（如 `store:toRead`）。
带子实体的域用点分两级（如 `chat:provider.toRead`）。

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
`toUpdate` / `toRemove` 对不存在的 id 抛 `USER_RECORD_NOT_FOUND`。

---

## sidecar

| 方法     | Channel          | 入参 | 返回                   |
| -------- | ---------------- | ---- | ---------------------- |
| `toRead` | `sidecar:toRead` | 无   | `Promise<FindStatusR>` |

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

| 方法          | Channel            | 入参 | 返回                   |
| ------------- | ------------------ | ---- | ---------------------- |
| `toRead`      | `updater:toRead`   | 无   | `Promise<FindStatusR>` |
| `check`       | `updater:check`    | 无   | `Promise<CheckR>`      |
| `download`    | `updater:download` | 无   | `Promise<void>`        |
| `install`     | `updater:install`  | 无   | `Promise<void>`        |
| `onEvent(cb)` | `updater:event`    | —    | 取消订阅函数           |

**`updater:event` 是推送通道，不是 invoke** —— 渲染侧以 `subscribe` 形态暴露。

---

## devtools

| 方法       | Channel             | 入参                   | 返回            |
| ---------- | ------------------- | ---------------------- | --------------- |
| `toUpdate` | `devtools:toUpdate` | `{ visible: boolean }` | `Promise<void>` |

仅开发态；生产调用抛 `DEVTOOLS_DISABLED`。

DevTools 开到**调用窗口自己**（handler 用 `event.sender` 定位）—— 多窗口下各开各的，
不再固定指向主窗口。

---

## overlay

| 方法       | Channel            | 入参                   | 返回                   |
| ---------- | ------------------ | ---------------------- | ---------------------- |
| `toRead`   | `overlay:toRead`   | 无                     | `Promise<{ visible }>` |
| `toUpdate` | `overlay:toUpdate` | `{ visible: boolean }` | `Promise<void>`        |

浮层窗口由 window 插件创建/销毁，两个频道经 `OverlayWindowPort` 读写它
（窗口不可用时抛 `OVERLAY_UNAVAILABLE`）。

---

## window

窗口域只负责「把窗口开出来」；当前只有 Agent 子窗口一种。

| 方法           | Channel               | 入参 | 返回            |
| -------------- | --------------------- | ---- | --------------- |
| `agent.toOpen` | `window:agent.toOpen` | 无   | `Promise<void>` |

Agent 子窗口**按需创建**（首次调用时建，已开则聚焦/从最小化恢复），窗口生命周期收在
`AgentWindowPort`（`host/capabilities/agent-window.ts`）；它是主窗口的子窗口（`parent`），
随主窗口关闭。主窗口 overview 用本频道打开 Agent 窗口，**不再在主窗口内跳转路由**。

---

## workspace

Agent 的**沙箱边界**：工作区（可挂多个源文件夹，其一为 primary）由主进程落库；
渲染进程只能按 `workspaceID` + **相对路径**访问 —— 绝对路径与越界路径在主进程被拒。

| 方法               | Channel                         | 入参                                      | 返回                         |
| ------------------ | ------------------------------- | ----------------------------------------- | ---------------------------- |
| `toRead`           | `workspace:toRead`              | 无                                        | `Promise<WorkspaceReadR[]>`  |
| `toWrite`          | `workspace:toWrite`             | `{ title, icon?, color?, folders }`       | `Promise<WorkspaceReadR>`    |
| `toUpdate`         | `workspace:toUpdate`            | `{ id, title?, icon?, color?, … }`        | `Promise<WorkspaceReadR>`    |
| `toRemove`         | `workspace:toRemove`            | `{ id }`                                  | `Promise<void>`              |
| `toArchive`        | `workspace:toArchive`           | `{ id }`                                  | `Promise<WorkspaceReadR>`    |
| `folders.toWrite`  | `workspace:folders.toWrite`     | `{ workspaceID, path, isPrimary? }`       | `Promise<FolderR>`           |
| `folders.toUpdate` | `workspace:folders.toUpdate`    | `{ id, isPrimary?, sort? }`               | `Promise<FolderR>`           |
| `folders.toRemove` | `workspace:folders.toRemove`    | `{ id }`                                  | `Promise<void>`              |
| `listDir`          | `workspace:listDir`             | `{ workspaceID, relative? }`              | `Promise<DirEntryR[]>`       |
| `search`           | `workspace:search`              | `{ workspaceID, query, limit? }`          | `Promise<SearchHitR[]>`      |
| `readFile`         | `workspace:readFile`            | `{ workspaceID, relative }`               | `Promise<FileContentR>`      |
| `git.probe`        | `workspace:git.probe`           | `{ workspaceID }`                         | `Promise<{ isRepo, branch }>`|
| `git.branches`     | `workspace:git.branches`        | `{ workspaceID }`                         | `Promise<{ current, branches }>` |
| `git.checkout`     | `workspace:git.checkout`        | `{ workspaceID, branch }`                 | `Promise<{ branch }>`        |
| `changes.toRead`   | `workspace:changes.toRead`      | `{ sessionID }`                           | `Promise<ChangesR>`          |
| `changes.toUndo`   | `workspace:changes.toUndo`      | `{ sessionID, changeID? }`                | `Promise<ChangesR>`          |

- 错误码：`WORKSPACE_NOT_FOUND` / `WORKSPACE_PATH_DUPLICATE` / `WORKSPACE_PATH_UNAVAILABLE` /
  `WORKSPACE_FOLDER_NOT_FOUND` / `WORKSPACE_FOLDER_REQUIRED` / `WORKSPACE_PATH_ESCAPE` /
  `WORKSPACE_ENTRY_NOT_FOUND` / `WORKSPACE_FILE_TOO_LARGE` / `WORKSPACE_GIT_FAILED` /
  `WORKSPACE_CHANGE_NOT_FOUND`
- 文件 API 与 git 一律以 **primary folder** 为沙箱根
- `changes` 日记只活在主进程内存（追踪本会话 `fs_write`，供撤销卡）
- 遍历一律跳过 `node_modules` / `.git` / `dist` 等与隐藏项（`.env.example` 例外）；
  单文件读取上限 2MB，检索有界（深度 8 / 目录 2000 / 命中 200）
- 目录选择用 `dialog.open({ directory: true })`

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

目标记录不存在时抛 `CHAT_{PROVIDER,SESSION,MESSAGE}_NOT_FOUND`。

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

**端口协议**（`src/host/capabilities/assistant-protocol.ts`，均为可结构化克隆的纯数据）：

| 方向            | 消息                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| renderer → main | `{ kind: 'start', runID, providerID, model, system?, messages: {role,content}[], host? }` |
| renderer → main | `{ kind: 'abort', runID }`                                                                |
| renderer → main | `{ kind: 'tool-approval', runID, toolCallId, approved }`                                  |
| main → renderer | `{ kind: 'text' \| 'reasoning', runID, blockID, text }`                                   |
| main → renderer | `{ kind: 'tool-call', runID, toolCallId, toolName, input }`                               |
| main → renderer | `{ kind: 'tool-approval-request', runID, toolCallId, toolName, input, prompt }`           |
| main → renderer | `{ kind: 'tool-result', runID, toolCallId, toolName, output, isError }`                   |
| main → renderer | `{ kind: 'finish', runID, finishReason, usage }`                                          |
| main → renderer | `{ kind: 'aborted' \| 'error', runID, message? }`                                         |

约束：单条消息 ≤ 1MB（JSON 字符数）、单请求 ≤ 200 条消息、同一端口并发运行 ≤ 4；端口关闭或窗口销毁 → 该端口所有运行立即 abort。

**`host` 是宿主扩展位**（`{ tools?: string[], approval?: 'auto' | 'ask' | 'readonly', workspaceID?: string | null, sessionID?: string, references?: string[] }`）：
渲染进程声明「本次运行允许哪些工具、怎么审批、沙箱根是哪个、引用了哪些文件」。根 → 路径由主进程查库解析，
工具清单以 `src/shared/agent-tools.ts` 为单一事实源（主进程白名单化，未声明的一律不暴露给模型）。

**引用（@ 工作区文件）以「路径名单」入提示词，不内联文件内容**：

- 渲染侧：composer 的 `@` 按钮（`views/agent/components/reference-picker.tsx`）基于 `workspace:listDir / search`
  选文件，落成 assistant-ui 的 **file 附件**（`aui.composer.addAttachment`）—— 所以引用在输入区可移除、随消息落库
- 适配器（`@i-thinking/chat/adapters/chat-model`）把用户消息里的 file/image part 收成 `attachments: string[]`
- studio 端口清洗后（`features/agent/references.ts`：去控制字符 / 限长 1024 / 最多 20 条 / 去重）放进 `host.references`
- 主进程把它拼到系统提示词末尾，并要求模型**用 `fs_read` 自己读**，不得臆造内容；
  真正的越界拦截仍由路径约束负责（提示词里的名单不构成授权）

**工具执行与审批**（离线通路独有；在线通路仍为纯文本）：

- 工具（`fs_list` / `fs_search` / `fs_read` / `fs_write`）在**主进程**执行，路径一律「workspaceID → primary path + 相对路径」，
  越界抛 `WORKSPACE_PATH_ESCAPE`（详见 [security.md](./security.md#6-数据面)）
- 写类工具执行前挂起等 `tool-approval` 回执；**超时或 abort 一律按拒绝落地**
- 审批策略：`auto` 全放行 / `ask`（默认）只读直接执行、写类询问 / `readonly` 拒绝一切写操作
- 一次生成最多 8 步（`stepCountIs(8)`），防止模型在工具间无限打转

**apiKey 不进端口、也不出主进程**：`key.toWrite` 只写、`key.has` 只答是与否，没有读回接口；系统密钥库（`safeStorage`）不可用时**拒绝保存**（`ASSISTANT_KEYSTORE_UNAVAILABLE`），不退化成明文。

---

## 错误码

`IPC_ERROR_CODES`（`src/shared/ipc/error.ts`）是有限联合，分类如下。

### 传输层

| code                   | 含义                                          |
| ---------------------- | --------------------------------------------- |
| `IPC_UNTRUSTED_SENDER` | sender 未登记或 URL 不合规                    |
| `IPC_INVALID_PAYLOAD`  | zod 校验失败（`details` 为拍平的 issue 列表） |
| `IPC_HANDLER_ERROR`    | 未预期异常（保留原始 `name`）                 |
| `IPC_UNKNOWN`          | 无法从 message 前缀还原 code                  |

### 业务失败

| code                             | 域         |
| -------------------------------- | ---------- |
| `CHAT_PROVIDER_NOT_FOUND`        | chat       |
| `CHAT_SESSION_NOT_FOUND`         | chat       |
| `CHAT_MESSAGE_NOT_FOUND`         | chat       |
| `USER_RECORD_NOT_FOUND`          | user       |
| `OVERLAY_UNAVAILABLE`            | overlay    |
| `DEVTOOLS_DISABLED`              | devtools   |
| `UPDATER_NOT_CONFIGURED`         | updater    |
| `UPDATER_NO_UPDATE_DOWNLOADED`   | updater    |
| `UPDATER_CHECK_FAILED`           | updater    |
| `ASSISTANT_FRAME_UNAVAILABLE`    | assistant  |
| `ASSISTANT_KEYSTORE_UNAVAILABLE` | assistant  |
| `DOC_PANDOC_MISSING`             | doc        |
| `DOC_INPUT_NOT_FOUND`            | doc        |
| `DOC_CONVERT_FAILED`             | doc        |
| `DOC_TIMEOUT`                    | doc        |
| `SCREENSHOT_ACTION_UNAVAILABLE`  | screenshot |
| `SCREENSHOT_NO_FILE`             | screenshot |
| `SCREENSHOT_BAD_PAYLOAD`         | screenshot |
| `SIDECAR_NOT_READY`              | sidecar    |
