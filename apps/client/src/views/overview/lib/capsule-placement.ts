/**
 * Overview 胶囊位置：localStorage（贴边 + 垂直比例）
 */
const STORAGE_KEY = 'ith:overview-capsule'

type CapsuleEdge = 'left' | 'right'

type CapsulePlacement = {
  yRatio: number
  edge: CapsuleEdge
}

const INITIAL_PLACEMENT: CapsulePlacement = {
  yRatio: 0.5,
  edge: 'right'
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
    if (!edge) return { ...INITIAL_PLACEMENT }

    return {
      yRatio: clampRatio(Number(parsed.yRatio)),
      edge
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
        yRatio: clampRatio(placement.yRatio),
        edge: placement.edge
      })
    )
  } catch {
    // quota / private mode：忽略
  }
}

export { INITIAL_PLACEMENT, readCapsulePlacement, writeCapsulePlacement }
export type { CapsuleEdge, CapsulePlacement }
