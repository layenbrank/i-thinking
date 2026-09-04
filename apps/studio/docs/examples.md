# Studio 使用示例

所有示例基于当前实现：全局 `itc`（`window.itc`，见 preload / `src/types/itc.d.ts`）。网页模式用 `findItc()` 探测。

## 1. 基础：直接用全局 / 探测

```ts
// Electron 渲染进程：与 setTimeout 同理
await itc.store.toRead({ key: 'theme' })

// 仅网页模式（pnpm dev:core）需要探测
import { findItc } from '@/lib/itc'

function tryFindItc() {
  try {
    return findItc()
  } catch {
    return null
  }
}
```

## 2. Store

```ts
await itc.store.toWrite({ key: 'theme', value: 'dark' })
const theme = await itc.store.toRead({ key: 'theme' }) // 'dark' | null 等
const has = await itc.store.has({ key: 'theme' })
await itc.store.toRemove({ key: 'theme' })
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

## 5. Sidecar 状态与文档转换

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

## 6. DevTools（仅开发态）

```ts
try {
  await itc.devtools.toUpdate({ visible: true })
} catch (error) {
  // 生产打包会拒绝
  console.error(error)
}
```

## 7. 主进程消息

```ts
const off = itc.app.onMessage(function (payload) {
  console.log('from main', payload)
})

// 组件卸载时
off()
```

## 8. 错误处理

Preload 将 Main 的 `IpcResult` 失败转为抛错：

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

以下为**文档示例**，按同样步骤可落到真实模块。

### 9.1 `shared/ipc/channels.ts`

```ts
SETTINGS: {
  READ: 'settings:read',
  WRITE: 'settings:write'
},
```

### 9.2 `shared/ipc/settings.ts`（类型 + zod）

```ts
import { z } from 'zod'

export type WriteP = {
  key: string
  value: unknown
}

export const WriteSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})
```

### 9.3 `shared/ipc/studio.ts` — 扩展 `Studio`

```ts
settings: {
  read: (input: { key: string }) => Promise<unknown>
  write: (input: WriteP) => Promise<void>
}
```

### 9.4 Plugin

```text
src/plugins/settings.ts   → models + desktop + commands + buildPlugin()
```

在同一文件内写 zod schema，并用 `registerHandler` 挂命令。

### 9.5 `main.ts` 注册

```ts
import { buildPlugin as buildSettingsPlugin } from './plugins/settings'

buildSettingsPlugin(), // 插入 plugins 数组合适位置
```

### 9.6 `preload.ts` 暴露

```ts
settings: {
  read(input) {
    return invoke(CHANNELS.SETTINGS.READ, input)
  },
  write(input) {
    return invoke(CHANNELS.SETTINGS.WRITE, input)
  }
}
```

### 9.7 Renderer

```ts
await itc.settings.write({ key: 'locale', value: 'zh-CN' })
const locale = await itc.settings.read({ key: 'locale' })
```

同步更新 [api-reference.md](./api-reference.md)、[modules.md](./modules.md)，并保证 `contract.test.ts` 绿。

## 10. 反例（禁止）

```ts
// ❌ 裸 IPC
window.ipcRenderer.invoke('anything')

// ❌ 任意 SQL
window.itc // 不存在 database.query(sql)

// ❌ Main 里用 import.meta.url 解析路径（Vite CJS 会变成 undefined）
// 应使用 src/plugins/paths.ts
```

## 11. 网页模式降级

```ts
import { findItc } from '@/lib/itc'

export async function loadTheme() {
  const bridge = (() => {
    try {
      return findItc()
    } catch {
      return null
    }
  })()

  if (!bridge) {
    return localStorage.getItem('theme')
  }
  return (await bridge.store.toRead({ key: 'theme' })) as string | null
}
```
