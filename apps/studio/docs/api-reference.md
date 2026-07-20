# Studio API 参考

源码真相：

- [`src/shared/ipc/contracts.ts`](../src/shared/ipc/contracts.ts) — `StudioApi`
- [`src/shared/ipc/channels.ts`](../src/shared/ipc/channels.ts) — Channel 常量
- [`src/shared/ipc/schemas.ts`](../src/shared/ipc/schemas.ts) — zod 入参
- [`src/preload/preload.ts`](../src/preload/preload.ts) — 暴露与错误转换

获取实例：

```ts
import { findStudio } from '@/lib/studio'
const studio = findStudio() // === window.studio
```

## 约定

### IpcResult（Main → Preload）

```ts
type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string }
```

Preload `invoke`：若 `!ok`，抛出 `Error('[code] message')`；Renderer 看到的是 **Promise resolve 业务数据** 或 **reject**。

### Channel 命名

`namespace:action`，多词 action 用 kebab-case（如 `sidecar:find-path`、`devtools:update-visible`）。

---

## store

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `get` | `store:get` | `{ key: string }`（非空） | `Promise<unknown>`（无则 `null`） |
| `set` | `store:set` | `{ key, value }` | `Promise<void>` |
| `has` | `store:has` | `{ key }` | `Promise<boolean>` |
| `delete` | `store:delete` | `{ key }` | `Promise<void>` |
| `clear` | `store:clear` | 无 | `Promise<void>` |
| `keys` | `store:keys` | 无 | `Promise<string[]>` |

实现：`electron-store`（Main `modules/store`）。

---

## dialog

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `open` | `dialog:open` | 可选 `{ multiple?, filters? }` | `Promise<string[] \| null>` |
| `save` | `dialog:save` | 可选 `{ defaultPath?, filters? }` | `Promise<string \| null>` |

`filters`: `{ name: string; extensions: string[] }[]`。取消操作为 `null`。

---

## user

领域仓储，**不是** SQL。

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `list` | `user:list` | 无 | `Promise<UserRecord[]>` |
| `create` | `user:create` | `{ name?, email? }` | `Promise<UserRecord>` |
| `update` | `user:update` | `{ id, name?, email? }` | `Promise<UserRecord>` |
| `remove` | `user:remove` | `{ id }` | `Promise<void>` |

`UserRecord`：

```ts
{
  id: number
  createdAt: string  // ISO
  updatedAt: string
  name: string | null
  email: string | null
}
```

`email` 允许合法邮箱或空字符串（见 schemas）。

---

## sidecar

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `findPath` | `sidecar:find-path` | `{ name }` | `Promise<string>` |
| `exec` | `sidecar:exec` | `{ name, args? }` | `Promise<SidecarExecResult>` |

`SidecarExecResult`：`{ code, signal, error? }`。

白名单（禁止路径分隔符与 `..`）：

- Windows：`corex.exe` / `generate.exe` / `service.exe`
- Unix：`corex` / `generate` / `service`

`args`：最多 64 项，单条最长 4096，禁止 `\0`；`spawn` 使用 `shell: false`。

---

## devtools

| 方法 | Channel | 入参 | 返回 |
|------|---------|------|------|
| `updateVisible` | `devtools:update-visible` | `{ visible: boolean }` | `Promise<void>` |

仅 `!app.isPackaged`；生产调用会 `IPC_HANDLER_ERROR`。

---

## app

| 方法 | 传输 | 说明 |
|------|------|------|
| `onMessage(cb)` | 事件 `app:message` | Main `webContents.send`；返回取消订阅函数 |

---

## 错误码

| code | 含义 |
|------|------|
| `IPC_UNTRUSTED_SENDER` | sender 未登记或不在允许 origin / file: |
| `IPC_INVALID_PAYLOAD` | zod 校验失败 |
| `IPC_HANDLER_ERROR` | handler / 业务抛错（message 为错误信息） |

另有业务层字符串错误（如 `sidecar not allowed: …`），经 `IPC_HANDLER_ERROR` 或结果对象的 `error` 字段返回（`sidecar.exec`）。
