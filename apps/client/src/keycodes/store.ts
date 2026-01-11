import { Store } from '@tauri-apps/plugin-store'

import {
  DEFAULT_KEYCODE_BINDINGS,
  KeyCodeSchema,
  type KeyCodeBindings,
  type KeyCodeConfigureV1,
  type KeyCodeID
} from '@/keycodes/types'

const FILENAME = 'keycode.json'
const STORE_KEY = 'config'

let storePromise: Promise<Store> | null = null

async function findStore(): Promise<Store> {
  if (storePromise) return storePromise
  storePromise = Store.load(FILENAME)
  return storePromise
}

function mergeBindings(partial?: Partial<KeyCodeBindings>): KeyCodeBindings {
  return {
    screenshot: partial?.screenshot ?? DEFAULT_KEYCODE_BINDINGS.screenshot,
    escape: partial?.escape ?? DEFAULT_KEYCODE_BINDINGS.escape
  }
}

export async function loadKeyCodeBindings(): Promise<KeyCodeBindings> {
  const store = await findStore()
  const raw = (await store.get<KeyCodeConfigureV1 | unknown>(STORE_KEY)) ?? null
  const parsed = KeyCodeSchema.safeParse(raw)
  if (!parsed.success) return { ...DEFAULT_KEYCODE_BINDINGS }
  return mergeBindings(parsed.data.bindings ?? undefined)
}

export async function updateKeyCodeBindings(
  bindings: KeyCodeBindings
): Promise<void> {
  const store = await findStore()
  const config: KeyCodeConfigureV1 = {
    version: 1,
    bindings
  }
  await store.set(STORE_KEY, config)
  await store.save()
  notifyShortcutBindingsChanged()
}

export async function updateKeyCodeBinding(
  id: KeyCodeID,
  accelerator: string
): Promise<void> {
  const current = await loadKeyCodeBindings()
  const next: KeyCodeBindings = {
    ...current,
    [id]: accelerator
  }
  await updateKeyCodeBindings(next)
}

export async function resetKeyCodeBindings(): Promise<void> {
  await updateKeyCodeBindings({ ...DEFAULT_KEYCODE_BINDINGS })
}

const CHANGE_EVENT = 'shortcuts:bindings-changed'

export function subscribeKeyCodeBindingsChanged(
  listener: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const wrapped = () => listener()
  window.addEventListener(CHANGE_EVENT, wrapped)
  return () => window.removeEventListener(CHANGE_EVENT, wrapped)
}

function notifyShortcutBindingsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
