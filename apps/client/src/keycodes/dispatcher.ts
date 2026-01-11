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

export async function dispatchKeyCode(id: KeyCodeID): Promise<void> {
  const list = registry.get(id)
  if (!list || list.length === 0) return

  const sorted = [...list].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.insertedAt - a.insertedAt
  })

  for (const entry of sorted) {
    try {
      if (entry.enabled && !entry.enabled()) continue
      const handled = await entry.handler()
      if (handled === true) return
    } catch (error) {
      console.error('[keycode] handler error', { id, error })
    }
  }
}
