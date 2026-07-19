# Studio 使用示例

所有示例基于当前实现：`findStudio()` → `window.studio`（见 `src/renderer/lib/studio.ts`）。

## 1. 基础：拿到 SDK

```ts
import { findStudio } from '@/lib/studio'

function useStudio() {
  try {
    return findStudio()
  } catch {
    // 网页模式（pnpm dev:core）或非 Electron：无 preload
    return null
  }
}
```

## 2. Store

```ts
const studio = findStudio()

await studio.store.set({ key: 'theme', value: 'dark' })
const theme = await studio.store.get({ key: 'theme' }) // 'dark' | null 等
const has = await studio.store.has({ key: 'theme' })
await studio.store.delete({ key: 'theme' })
const keys = await studio.store.keys()
await studio.store.clear()
```

## 3. Dialog

```ts
const studio = findStudio()

const files = await studio.dialog.open({
  multiple: true,
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
})
// string[] | null（取消为 null）

const savePath = await studio.dialog.save({
  defaultPath: 'export.json',
  filters: [{ name: 'JSON', extensions: ['json'] }]
})
// string | null
```

## 4. User 仓储（禁止拼 SQL）

```ts
const studio = findStudio()

const users = await studio.user.list()

const created = await studio.user.create({
  name: 'alice',
  email: 'alice@example.com'
})

const updated = await studio.user.update({
  id: created.id,
  name: 'alice-2'
})

await studio.user.remove({ id: updated.id })
```

## 5. Bin（白名单）

当前允许：`corex.exe` / `generate.exe` / `service.exe`（见 `src/main/modules/bin/allowlist.ts`）。

```ts
const studio = findStudio()

const binPath = await studio.bin.getPath({ exeName: 'corex.exe' })
const result = await studio.bin.exec({
  exeName: 'corex.exe',
  args: ['--help']
})
// { code, signal, error? }
```

路径穿越或未在白名单的名字会失败。

## 6. DevTools（仅开发态）

```ts
const studio = findStudio()

try {
  await studio.devtools.updateVisible({ visible: true })
} catch (error) {
  // 生产打包会拒绝
  console.error(error)
}
```

## 7. 主进程消息

```ts
const studio = findStudio()

const off = studio.app.onMessage(function (payload) {
  console.log('from main', payload)
})

// 组件卸载时
off()
```

## 8. 错误处理

Preload 将 Main 的 `IpcResult` 失败转为抛错：

```ts
try {
  await findStudio().store.get({ key: '' }) // zod 失败
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
SETTINGS_READ: 'settings:read',
SETTINGS_WRITE: 'settings:write',
```

### 9.2 `shared/ipc/schemas.ts`

```ts
export const settingsWriteSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})
```

### 9.3 `shared/ipc/contracts.ts` — 扩展 `StudioApi`

```ts
settings: {
  read: (input: { key: string }) => Promise<unknown>
  write: (input: { key: string; value: unknown }) => Promise<void>
}
```

### 9.4 Main 模块

```text
src/main/modules/settings/
  service.ts
  handlers.ts
  index.ts      → createSettingsModule()
```

`handlers.ts` 使用 `registerHandler(ctx, CHANNELS.SETTINGS_READ, schema, …)`。

### 9.5 `bootstrap.ts` 注册

```ts
createSettingsModule(), // 插入 modules 数组合适位置
```

### 9.6 `preload/preload.ts` 暴露

```ts
settings: {
  read(input) {
    return invoke(CHANNELS.SETTINGS_READ, input)
  },
  write(input) {
    return invoke(CHANNELS.SETTINGS_WRITE, input)
  }
}
```

### 9.7 Renderer

```ts
await findStudio().settings.write({ key: 'locale', value: 'zh-CN' })
const locale = await findStudio().settings.read({ key: 'locale' })
```

同步更新 [api-reference.md](./api-reference.md) 与 [modules.md](./modules.md)。

## 10. 反例（禁止）

```ts
// ❌ 裸 IPC
window.ipcRenderer.invoke('anything')

// ❌ 任意 SQL
window.studio // 不存在 database.query(sql)

// ❌ Main 里用 import.meta.url 解析路径（Vite CJS 会变成 undefined）
// 应使用 src/main/paths.ts
```

## 11. 网页模式降级

```ts
import { findStudio } from '@/lib/studio'

export async function loadTheme() {
  const studio = (() => {
    try {
      return findStudio()
    } catch {
      return null
    }
  })()

  if (!studio) {
    return localStorage.getItem('theme')
  }
  return (await studio.store.get({ key: 'theme' })) as string | null
}
```
