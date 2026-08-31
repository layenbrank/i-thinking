# Studio API 参考

源码真相：

- [`src/shared/ipc/studio.ts`](../src/shared/ipc/studio.ts) — `Studio` API 形状
- [`src/shared/ipc/channels.ts`](../src/shared/ipc/channels.ts) — Channel 常量
- [`src/shared/ipc/<domain>.ts`](../src/shared/ipc/) — 手写类型 + zod（不 `z.infer`）
- [`src/preload/preload.ts`](../src/preload/preload.ts) — 暴露与错误转换

获取实例：

```ts
// 推荐：全局挂载（preload exposeInMainWorld('itc')）
itc.store.toRead({ key: 'theme' })

// 网页模式探测
import { findItc } from '@/lib/itc'
const bridge = findItc() // === window.itc === itc
```

## 约定

### IpcResult（Main → Preload）

```ts
type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string }
```

Preload `invoke`：若 `!ok`，抛出 `Error('[code] message')`。

### Channel 命名

`namespace:action`；CRUD 等与方法同名的 action 用 camelCase（如 `store:toRead`）。

---

## store

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `toRead` | `store:toRead` | `{ key: string }` | `Promise<unknown>` |
| `toWrite` | `store:toWrite` | `{ key, value }` | `Promise<void>` |
| `has` | `store:has` | `{ key }` | `Promise<boolean>` |
| `toRemove` | `store:toRemove` | `{ key }` | `Promise<void>` |
| `clear` | `store:clear` | 无 | `Promise<void>` |
| `keys` | `store:keys` | 无 | `Promise<string[]>` |

---

## dialog

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `open` | `dialog:open` | 可选 `{ multiple?, filters? }` | `Promise<string[] \| null>` |
| `save` | `dialog:save` | 可选 `{ defaultPath?, filters? }` | `Promise<string \| null>` |

---

## user

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `toRead` | `user:toRead` | 无 | `Promise<ReadR[]>` |
| `toWrite` | `user:toWrite` | `WriteP` | `Promise<ReadR>` |
| `toUpdate` | `user:toUpdate` | `UpdateP` | `Promise<ReadR>` |
| `toRemove` | `user:toRemove` | `RemoveP` | `Promise<void>` |

`ReadR`：`{ id: string; createdAt; updatedAt; name; email }`（ISO 时间字符串）。

---

## sidecar

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `findStatus` | `sidecar:find-status` | 无 | `Promise<FindStatusR>` |

`FindStatusR`：`{ isReady, version, actions, hasCorex, hasPandoc }`。

---

## doc

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `convert` | `doc:convert` | `ConvertP` | `Promise<ConvertR>` |

`format`：`markdown` \| `html` \| `docx` \| `pdf` \| `plain`。

---

## screenshot

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `capture` | `screenshot:capture` | 无 | `Promise<{ path, width, height }>` |

路径由 Main 写入 `userData/screenshots`。Corex 返回 path string 或 `{ path }`。

---

## updater

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `findStatus` | `updater:find-status` | 无 | `Promise<FindStatusR>` |
| `check` | `updater:check` | 无 | `Promise<CheckR>` |
| `download` | `updater:download` | 无 | `Promise<void>` |
| `install` | `updater:install` | 无 | `Promise<void>` |
| `onEvent(cb)` | `updater:event` | — | 取消订阅函数 |

---

## devtools

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `updateVisible` | `devtools:update-visible` | `{ visible: boolean }` | `Promise<void>` |

仅开发态。

---

## app

| 方法 | 传输 | 说明 |
|------|------|------|
| `onMessage(cb)` | `app:message` | 返回取消订阅函数 |

---

## 错误码

| code | 含义 |
|------|------|
| `IPC_UNTRUSTED_SENDER` | sender 未登记 |
| `IPC_INVALID_PAYLOAD` | zod 失败 |
| `IPC_HANDLER_ERROR` | 业务抛错 |
