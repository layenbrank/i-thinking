/**
 * Overview 胶囊位置：localStorage 持久化（相对坐标，适配 resize）
 */
const STORAGE_KEY = 'ith:overview-capsule'

type CapsuleEdge = 'left' | 'right'

type CapsulePlacement = {
  xRatio: number
  yRatio: number
  edge: CapsuleEdge | null
  collapsed: boolean
}

/** 无缓存时：右侧垂直居中 + 收缩 */
const INITIAL_PLACEMENT: CapsulePlacement = {
  xRatio: 1,
  yRatio: 0.5,
  edge: 'right',
  collapsed: true
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function parseEdge(value: unknown): CapsuleEdge | null {
  if (value === 'left' || value === 'right') return value
  return null
}

function readCapsulePlacement(): CapsulePlacement {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...INITIAL_PLACEMENT }

    const parsed = JSON.parse(raw) as Partial<CapsulePlacement>
    const edge = parseEdge(parsed.edge)
    return {
      xRatio: clampRatio(Number(parsed.xRatio)),
      yRatio: clampRatio(Number(parsed.yRatio)),
      edge,
      collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : true
    }
  } catch {
    return { ...INITIAL_PLACEMENT }
  }
}

function writeCapsulePlacement(placement: CapsulePlacement) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        xRatio: clampRatio(placement.xRatio),
        yRatio: clampRatio(placement.yRatio),
        edge: placement.edge,
        collapsed: placement.collapsed
      })
    )
  } catch {
    // quota / private mode：忽略
  }
}

export { INITIAL_PLACEMENT, readCapsulePlacement, writeCapsulePlacement }
export type { CapsuleEdge, CapsulePlacement }
