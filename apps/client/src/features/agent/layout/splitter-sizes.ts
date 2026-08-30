/**
 * Splitter 栏宽：默认值、读写 localStorage、双击重置
 */
const SPLITTER_STORAGE_KEY = 'agent.splitter.sizes'

const SESSION_SIZE = 260
const SESSION_MIN = 200
const SESSION_MAX = 420
const WORKBENCH_MIN = 360
const PLAN_SIZE = 320
const PLAN_MIN = 240
const PLAN_MAX = 480

interface SplitterSizes {
  session: number
  plan: number
}

const SPLITTER_SIZES: SplitterSizes = {
  session: SESSION_SIZE,
  plan: 0
}

function parseSplitterSizes(raw: string | null): SplitterSizes {
  if (!raw) return { ...SPLITTER_SIZES }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...SPLITTER_SIZES }
    const record = parsed as Record<string, unknown>
    const session =
      typeof record.session === 'number' ? record.session : SESSION_SIZE
    const plan = typeof record.plan === 'number' ? record.plan : 0
    return {
      session: Math.min(SESSION_MAX, Math.max(0, session)),
      plan: Math.min(PLAN_MAX, Math.max(0, plan))
    }
  } catch {
    return { ...SPLITTER_SIZES }
  }
}

function findSplitterSizes(): SplitterSizes {
  if (typeof localStorage === 'undefined') return { ...SPLITTER_SIZES }
  return parseSplitterSizes(localStorage.getItem(SPLITTER_STORAGE_KEY))
}

function writeSplitterSizes(sizes: SplitterSizes) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SPLITTER_STORAGE_KEY, JSON.stringify(sizes))
}

export {
  SPLITTER_STORAGE_KEY,
  SESSION_SIZE,
  SESSION_MIN,
  SESSION_MAX,
  WORKBENCH_MIN,
  PLAN_SIZE,
  PLAN_MIN,
  PLAN_MAX,
  SPLITTER_SIZES,
  findSplitterSizes,
  writeSplitterSizes
}
export type { SplitterSizes }
