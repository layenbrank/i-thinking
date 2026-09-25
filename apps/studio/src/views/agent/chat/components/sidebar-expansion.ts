/**
 * 左栏工作区树的**开合记忆**。
 *
 * 只记「用户显式点过的那几个键」：工作区列表会增删，存下来的映射里可能留着已删除工作区的键，
 * 读回时不用清洗（查不到就当没表过态，默认展开）；反过来，**没键才是「默认展开」**，
 * 所以这里不能把默认值写进存储 —— 否则新增工作区会被存成折叠。
 */

const STORAGE_KEY = 'studio.agent.sidebar'

const ARCHIVED_OPEN = false

interface SidebarState {
  /** 工作区 id → 是否展开；缺键表示还没表过态 */
  expanded: Record<string, boolean>
  /** 「已归档」分区开合；归档是低频区，默认收起 */
  archivedOpen: boolean
}

function parseExpanded(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const expanded: Record<string, boolean> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (id && typeof value === 'boolean') expanded[id] = value
  }
  return expanded
}

function parseSidebarState(raw: string | null): SidebarState {
  const fallback: SidebarState = { expanded: {}, archivedOpen: ARCHIVED_OPEN }
  if (!raw) return fallback

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback

    const record = parsed as Record<string, unknown>
    return {
      expanded: parseExpanded(record.expanded),
      archivedOpen: typeof record.archivedOpen === 'boolean' ? record.archivedOpen : ARCHIVED_OPEN
    }
  } catch (error) {
    console.warn('[agent] 侧栏开合存档损坏，回落默认', error)
    return fallback
  }
}

function findSidebarState(): SidebarState {
  if (typeof localStorage === 'undefined') return { expanded: {}, archivedOpen: ARCHIVED_OPEN }
  return parseSidebarState(localStorage.getItem(STORAGE_KEY))
}

function writeSidebarState(state: SidebarState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ expanded: state.expanded, archivedOpen: state.archivedOpen })
  )
}

export { STORAGE_KEY, ARCHIVED_OPEN, findSidebarState, parseSidebarState, writeSidebarState }
export type { SidebarState }
