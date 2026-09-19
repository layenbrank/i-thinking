import { ENGINE_STORE_KEY, ENGINES, findEngine } from '@/views/overview/engine/constants'

function parseEngineKey(value: unknown): string {
  if (!value || typeof value !== 'object') return ENGINES[0].key
  const key = (value as { key?: unknown }).key
  if (typeof key !== 'string') return ENGINES[0].key
  const known = ENGINES.some(function (engine) {
    return engine.key === key
  })
  return known ? key : ENGINES[0].key
}

async function readEngineKey(): Promise<string> {
  try {
    const value = await itc.store.toRead({ key: ENGINE_STORE_KEY })
    return parseEngineKey(value)
  } catch (error) {
    console.warn('[engine] 读不到已选搜索引擎', error)
    return ENGINES[0].key
  }
}

async function writeEngineKey(key: string): Promise<void> {
  await itc.store.toWrite({ key: ENGINE_STORE_KEY, value: { key: findEngine(key).key } })
}

export { parseEngineKey, readEngineKey, writeEngineKey }
