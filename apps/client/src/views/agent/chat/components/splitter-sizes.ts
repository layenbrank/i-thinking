/**
 * Agent 三栏的栏宽持久化。
 *
 * 夹取 / 吸附 / 收起全交给 `react-resizable-panels`（design 包 `components/resizable`）：
 * 库的 `minSize` / `maxSize` / `collapsible` / `collapsedSize` 就是干这个的。
 * 这里只管库不管的事：默认值与「记住上次拖到哪」。
 *
 * 库只接受**覆盖全部面板**的 `defaultLayout`（键数不等就整份忽略），
 * 所以存档必须带齐三个栏位，解析时少一个就整份作废、回落默认。
 */

const SPLITTER_STORAGE_KEY = 'agent.splitter.sizes'

const SESSION_ID = 'agent-session'
const MAIN_ID = 'agent-main'
const PLAN_ID = 'agent-plan'

/** 单位是像素：库把数字当 px 解释（无单位的字符串才是百分比） */
const SESSION_SIZE = 260
const SESSION_MIN = 200
const SESSION_MAX = 420

const WORKBENCH_MIN = 360

const PLAN_SIZE = 320
const PLAN_MIN = 240
const PLAN_MAX = 480

/** 库的 `Layout` 是「面板 id → flexGrow」，我们不解释它，原样存回去 */
type SplitterLayout = Record<string, number>

const PANEL_IDS = [SESSION_ID, MAIN_ID, PLAN_ID]

/**
 * 存储的容错：三个栏位都得在，且是有限非负数，总和还得为正。
 * 任何一项不满足就返回 `undefined`，让库走自己的默认分配 ——
 * 宁可回到初始布局，也不要拿着半截布局去撑。
 */
function parseSplitterLayout(raw: unknown): SplitterLayout | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const record = raw as Record<string, unknown>
  const layout: SplitterLayout = {}
  let total = 0

  for (const id of PANEL_IDS) {
    const value = record[id]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
    layout[id] = value
    total += value
  }

  return total > 0 ? layout : undefined
}

function findSplitterLayout(): SplitterLayout | undefined {
  if (typeof localStorage === 'undefined') return undefined
  const raw = localStorage.getItem(SPLITTER_STORAGE_KEY)
  if (!raw) return undefined
  try {
    return parseSplitterLayout(JSON.parse(raw))
  } catch (error) {
    console.warn('[agent] 分栏布局存档损坏，回落默认', error)
    return undefined
  }
}

function writeSplitterLayout(layout: SplitterLayout): void {
  if (typeof localStorage === 'undefined') return
  const next = parseSplitterLayout(layout)
  if (!next) return
  localStorage.setItem(SPLITTER_STORAGE_KEY, JSON.stringify(next))
}

export {
  SPLITTER_STORAGE_KEY,
  SESSION_ID,
  MAIN_ID,
  PLAN_ID,
  SESSION_SIZE,
  SESSION_MIN,
  SESSION_MAX,
  WORKBENCH_MIN,
  PLAN_SIZE,
  PLAN_MIN,
  PLAN_MAX,
  findSplitterLayout,
  writeSplitterLayout
}
export type { SplitterLayout }
