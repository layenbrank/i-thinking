import type { KeyCodeID } from '@/keycodes/types'

type KeyCodeHandler = {
  token: symbol
  priority: number
  enabled?: () => boolean
  handler: () => boolean | void | Promise<boolean | void>
  insertedAt: number
}

const registry = new Map<KeyCodeID, KeyCodeHandler[]>()
let counter = 0

export type RegisterKeyCodeHandlerOptions = {
  priority?: number
  enabled?: () => boolean
}

export function registerKeyCodeHandler(
  id: KeyCodeID,
  handler: () => boolean | void | Promise<boolean | void>,
  options?: RegisterKeyCodeHandlerOptions
): () => void {
  const entry: KeyCodeHandler = {
    token: Symbol('keycode-handler'),
    priority: options?.priority ?? 0,
    enabled: options?.enabled,
    handler,
    insertedAt: counter++
  }

  const list = registry.get(id) ?? []
  list.push(entry)
  registry.set(id, list)

  return () => {
    const current = registry.get(id)
    if (!current) return
    const next = current.filter((x) => x.token !== entry.token)
    if (next.length === 0) registry.delete(id)
    else registry.set(id, next)
  }
}

/**
 * 派发：按 priority 降序、同优先级后注册者优先，逐个调用处理器。
 *
 * 返回是否有人「接管」（处理器返回 `true`）—— 调用方据此决定要不要走兜底
 * （如主窗口的全局截图键没人接管时直连 `capture:open`）。
 */
export async function dispatchKeyCode(id: KeyCodeID): Promise<boolean> {
  const list = registry.get(id)
  if (!list || list.length === 0) return false

  const sorted = [...list].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.insertedAt - a.insertedAt
  })

  for (const entry of sorted) {
    try {
      if (entry.enabled && !entry.enabled()) continue
      const handled = await entry.handler()
      if (handled === true) return true
    } catch (error) {
      console.error('[keycode] handler error', { id, error })
    }
  }

  return false
}
