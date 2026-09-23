/**
 * 指令页的栏宽与布局持久化。
 *
 * 编排台（`workspace.tsx`）是两层嵌套的可拖分栏：外层「列表 | 工作区」，工作区内「编辑器 / 运行台」
 * 上下叠；卡片墙（`directive.tsx`）只用其中的运行台一项，铺成「墙 / 运行台」。夹取、吸附、收起交给
 * `react-resizable-panels`；这里只管库不管的事 —— 默认尺寸、记住上次拖到哪、两侧栏的开合。
 *
 * 数字单位是像素（无单位的字符串才是百分比）。面板 id 参与存档的键，必须与用它的页面一致。
 */

const STORAGE_KEY = 'studio.directive.splitter'

/** 四个分栏组各有一份布局，按组 id 分别存 */
const PAGE_GROUP_ID = 'directive-page'
const STACK_GROUP_ID = 'directive-stack'
const PANEL_GROUP_ID = 'directive-panel'

/** 卡片墙只有「墙 / 运行台」两层，跟编排台的外层不是一套布局，得单独存 */
const WALL_GROUP_ID = 'directive-wall'

const LIST_ID = 'directive-list'
const WORKSPACE_ID = 'directive-workspace'
const WALL_ID = 'directive-wall-panel'
const EDITOR_ID = 'directive-editor'
const RUN_ID = 'directive-run'
const META_ID = 'directive-meta'
const STEPS_ID = 'directive-steps'

const LIST_SIZE = 300
const LIST_MIN = 240
const LIST_MAX = 420

/** 工作区的最小宽度：再窄编辑器就摆不下元信息 + 步骤两栏 */
const WORKSPACE_MIN = 420

/** 卡片墙的最小高度：留够两三行卡片，拖到底也不至于被运行台吃光 */
const WALL_MIN = 560

/** 编辑器与运行台的最小高度 */
const EDITOR_MIN = 240

const RUN_SIZE = 240
const RUN_MIN = 160
const RUN_MAX = 460

/** 运行台收起后只剩标题栏，高度必须与标题栏（`h-12` = 48px）一致才对得上 */
const RUN_COLLAPSED = 48

const META_SIZE = 264
const META_MIN = 240
const META_MAX = 420

const STEPS_MIN = 300

const LIST_OPEN = true
const RUN_OPEN = true

/** 库的 `Layout` 是「面板 id → flexGrow」，我们不解释它，原样存回去 */
type SplitterLayout = Record<string, number>

interface SplitterState {
  /** 组 id → 该组的布局；没拖过的组缺省，由库自行分配 */
  layouts: Record<string, SplitterLayout | undefined>
  isListOpen: boolean
  isRunOpen: boolean
}

interface SplitterOpen {
  isListOpen: boolean
  isRunOpen: boolean
}

/**
 * 存储的容错：只接受正数项。
 * 解析不出任何有效项时返回 `undefined`，让库走自己的默认分配 ——
 * 宁可回到初始布局，也不要拿着半截布局去撑。
 */
function parseSplitterLayout(raw: unknown): SplitterLayout | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const layout: SplitterLayout = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    layout[id] = value
  }

  return Object.keys(layout).length > 0 ? layout : undefined
}

function parseLayouts(raw: unknown): SplitterState['layouts'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const layouts: SplitterState['layouts'] = {}
  for (const [groupId, value] of Object.entries(raw as Record<string, unknown>)) {
    const layout = parseSplitterLayout(value)
    if (layout) layouts[groupId] = layout
  }

  return layouts
}

function parseSplitterState(raw: string | null): SplitterState {
  const fallback: SplitterState = {
    layouts: {},
    isListOpen: LIST_OPEN,
    isRunOpen: RUN_OPEN
  }
  if (!raw) return fallback

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback

    const record = parsed as Record<string, unknown>

    return {
      layouts: parseLayouts(record.layouts),
      isListOpen: typeof record.isListOpen === 'boolean' ? record.isListOpen : LIST_OPEN,
      isRunOpen: typeof record.isRunOpen === 'boolean' ? record.isRunOpen : RUN_OPEN
    }
  } catch (error) {
    console.warn('[directive] 分栏布局存档损坏，回落默认', error)
    return fallback
  }
}

function findSplitterState(): SplitterState {
  if (typeof localStorage === 'undefined') {
    return { layouts: {}, isListOpen: LIST_OPEN, isRunOpen: RUN_OPEN }
  }
  return parseSplitterState(localStorage.getItem(STORAGE_KEY))
}

function writeSplitterState(state: SplitterState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      layouts: state.layouts,
      isListOpen: state.isListOpen,
      isRunOpen: state.isRunOpen
    })
  )
}

/** 只更新某一组的布局，开合状态与别的组都留着 */
function writeSplitterLayout(groupId: string, layout: SplitterLayout): void {
  const current = findSplitterState()
  writeSplitterState({
    ...current,
    layouts: { ...current.layouts, [groupId]: layout }
  })
}

/** 收起 / 展开时也存一次：下次打开还得是用户上次看到的样子。只给要改的那一项即可 */
function writeSplitterOpen(open: Partial<SplitterOpen>): void {
  writeSplitterState({ ...findSplitterState(), ...open })
}

export {
  EDITOR_ID,
  EDITOR_MIN,
  LIST_ID,
  LIST_MAX,
  LIST_MIN,
  LIST_SIZE,
  META_ID,
  META_MAX,
  META_MIN,
  META_SIZE,
  PAGE_GROUP_ID,
  PANEL_GROUP_ID,
  RUN_COLLAPSED,
  RUN_ID,
  RUN_MAX,
  RUN_MIN,
  RUN_SIZE,
  STACK_GROUP_ID,
  STEPS_ID,
  STEPS_MIN,
  WALL_GROUP_ID,
  WALL_ID,
  WALL_MIN,
  WORKSPACE_ID,
  WORKSPACE_MIN,
  findSplitterState,
  writeSplitterLayout,
  writeSplitterOpen
}
