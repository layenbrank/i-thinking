# Studio 使用示例

所有示例基于当前实现：全局 `itc`（`window.itc`，见 preload / `src/types/itc.d.ts`）。该对象只由 preload 注入，网页预览（`dev:core`）下不存在。

## 1. 基础

```ts
// Electron 渲染进程：与 setTimeout 同理
await itc.store.toRead({ key: 'locale' })

// 网页预览（pnpm dev:core）没有 preload，需要兼容时自行判断
const bridge = typeof itc === 'undefined' ? null : itc
```

## 2. Store

```ts
await itc.store.toWrite({ key: 'locale', value: 'zh-CN' })
const locale = await itc.store.toRead({ key: 'locale' }) // 'zh-CN' | null 等
const has = await itc.store.has({ key: 'locale' })
await itc.store.toRemove({ key: 'locale' })
const keys = await itc.store.keys()
await itc.store.clear()
```

## 3. Dialog

```ts
const files = await itc.dialog.open({
  multiple: true,
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
})
// string[] | null（取消为 null）

const savePath = await itc.dialog.save({
  defaultPath: 'export.json',
  filters: [{ name: 'JSON', extensions: ['json'] }]
})
// string | null
```

## 4. User 仓储（禁止拼 SQL）

```ts
const users = await itc.user.toRead()

const created = await itc.user.toWrite({
  name: 'alice',
  email: 'alice@example.com'
})

const updated = await itc.user.toUpdate({
  id: created.id,
  name: 'alice-2'
})

await itc.user.toRemove({ id: updated.id })
```

## 5. Chat 会话 / 消息 / Provider

对话数据全部落在主进程（Drizzle），渲染进程只存取不解析消息体：`format` + `content` 由本地 MessageFormatAdapter 产出（见 [api-reference.md](./api-reference.md#chat)）。

```ts
// 会话列表：置顶优先，其次最近活动
const sessions = await itc.chat.session.toRead()

const session = await itc.chat.session.toWrite({ title: '新会话' })

// 追加一条消息（id 可用客户端生成，保证 parentID 分支关系与 UI 一致）
const message = await itc.chat.message.toAppend({
  id: crypto.randomUUID(),
  sessionID: session.id,
  parentID: null,
  format: 'ai-sdk/v6',
  content: JSON.stringify({ role: 'user', parts: [{ type: 'text', text: '你好' }] })
})

// 重生成分支：新消息挂到同一条父消息上
await itc.chat.message.toAppend({
  sessionID: session.id,
  parentID: message.parentID,
  format: 'ai-sdk/v6',
  content: JSON.stringify({ role: 'assistant', parts: [{ type: 'text', text: '重生成的回答' }] })
})

// 会话重命名 / 置顶
await itc.chat.session.toUpdate({ id: session.id, title: '改名', pinned: true })

// provider 只存元数据，apiKey 走 itc.assistant.key.toWrite，不出主进程
const provider = await itc.chat.provider.toWrite({
  kind: 'ollama',
  name: '我的 Ollama',
  baseUrl: 'http://127.0.0.1:11434',
  // 模型声明可带能力与上下文窗口；写成纯字符串（`['qwen3:8b']`）等价于只给 id
  models: [{ id: 'qwen3:8b', capabilities: { tools: true }, limit: { context: 131_072 } }],
  model: 'qwen3:8b'
})

await itc.assistant.key.toWrite({ providerID: provider.id, apiKey: 'sk-...' })

await itc.chat.provider.toRemove({ id: provider.id })
// 删 provider 不会删会话，只把会话的 providerID 置空
```

## 6. Sidecar 状态与文档转换

```ts
const status = await itc.sidecar.findStatus()
// { isReady, version, actions, hasCorex, hasPandoc }

const converted = await itc.doc.convert({
  inputPath: 'C:/docs/note.md',
  outputPath: 'C:/docs/note.html',
  format: 'html'
})
```

截图：`itc.screenshot.capture()` → Main → corex Action `capture.screenshot`。

## 7. DevTools（仅开发态）

```ts
try {
  await itc.devtools.toUpdate({ visible: true })
} catch (error) {
  // 生产打包会拒绝
  console.error(error)
}
```

## 8. 错误处理

Preload 将 Main 的 `IpcEnvelope` 失败转为抛错（`IpcClientError`，code 带在 message 前缀里）：

```ts
try {
  await itc.store.toRead({ key: '' }) // zod 失败
} catch (error) {
  // Error: [IPC_INVALID_PAYLOAD] ...
  console.error(String(error))
}
```

常见 `code` 见 [api-reference.md](./api-reference.md#错误码)。

## 9. 端到端：新增一条 IPC（示例 settings）

以下为**文档示例**，按同样步骤可落到真实域。**契约侧缺任何一步都编译不过** ——
这是这套设计的核心保障。

### 9.1 `shared/ipc/channels.ts` — 加频道

```ts
SETTINGS: {
  READ: 'settings:read',
  WRITE: 'settings:write'
},
```

### 9.2 `shared/ipc/specs/settings.ts` — 加 schema

```ts
import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const WriteSchema = z.object({ key: z.string().min(1), value: z.unknown() })

export const settingsSpecs = {
  [CHANNELS.SETTINGS.READ]: { in: z.object({ key: z.string() }), out: z.unknown() },
  [CHANNELS.SETTINGS.WRITE]: { in: WriteSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'settings'>, ChannelSpec>
```

并入 `specs/index.ts` 的 `INVOKE_SPECS` —— 穷尽性断言会强制这一步。

### 9.3 `shared/ipc/api.ts` — 加 Api 叶子

```ts
settings: {
  read: IpcFn<typeof CHANNELS.SETTINGS.READ>
  write: IpcFn<typeof CHANNELS.SETTINGS.WRITE>
}
```

### 9.4 `host/ipc/handlers/settings.ts` — 实现切片

```ts
export function buildSettingsHandlers(): DomainHandlers<'settings'> {
  return {
    [CHANNELS.SETTINGS.READ]: function (input) {
      return service.toRead(input.key)
    },
    [CHANNELS.SETTINGS.WRITE]: function (input) {
      service.toWrite(input.key, input.value)
    }
  }
}
```

并入 `host/ipc/index.ts` 的 `buildHandlers`。

> **频道注册不再由该域承担** —— `host/ipc` 遍历契约统一注册。
> 只有带生命周期需求（起停 / 建窗 / 关库）的域才写 `host/capabilities/<domain>.ts`
> 插件并在 `main.ts` 注册。

### 9.5 `preload.ts` — 加一行

```ts
settings: {
  read: toInvoke(CHANNELS.SETTINGS.READ),
  write: toInvoke(CHANNELS.SETTINGS.WRITE)
},
```

漏掉这一行，`satisfies Api` 会当场报错。

### 9.6 Renderer

```ts
await itc.settings.write({ key: 'locale', value: 'zh-CN' })
const locale = await itc.settings.read({ key: 'locale' })
```

同步更新 [api-reference.md](./api-reference.md)、[modules.md](./modules.md)。

## 10. 反例（禁止）

```ts
// ❌ 裸 IPC
window.ipcRenderer.invoke('anything')

// ❌ 任意 SQL
window.itc // 不存在 database.query(sql)

// ❌ Main 里用 import.meta.url 解析路径（Vite CJS 会变成 undefined）
// 应使用 src/host/framework/paths.ts
```

## 11. 网页模式降级

```ts
export async function readSetting(key: string): Promise<unknown> {
  // `itc` 由 preload 注入；网页预览（pnpm dev:core）没有它
  if (typeof itc === 'undefined') return null
  return await itc.store.toRead({ key })
}
```
