/**
 * 指令卡 / 骨架 / 估高共用尺寸。
 *
 * 开合壳动画的目标高度必须按「列数 × 行高 + 组内 padding」算，
 * 否则壳动画终点与真卡网格不一致，会轻跳一下。
 */

const CARD_SIZE = {
  wall: {
    /** 左右分区：左内容 + 右状态/运行，略矮于旧纵向堆叠 */
    minHeight: 132,
    className: 'min-h-[132px]',
    /** 与 WALL_GRID 的 gap-3.5 一致 */
    gap: 14,
    /** group-section wall body 的 pt-3 */
    bodyPad: 12,
    /** minHeight + gap，单行滚动估高 */
    row: 146,
    intrinsic: 'auto_132px'
  },
  rail: {
    minHeight: 84,
    className: 'min-h-[84px]',
    /** 与 RAIL_GRID 的 gap-1.5 一致 */
    gap: 6,
    bodyPad: 0,
    row: 90,
    intrinsic: 'auto_84px'
  },
  library: {
    minHeight: 148,
    className: 'min-h-[148px]',
    gap: 12,
    bodyPad: 0,
    row: 160,
    intrinsic: 'auto_148px'
  }
} as const

type CardSizeVariant = keyof typeof CARD_SIZE

/** 对齐 Tailwind：sm=2 / xl=3 / 2xl=4（与墙面网格一致） */
function findWallCols(width: number): number {
  if (width >= 1536) return 4
  if (width >= 1280) return 3
  if (width >= 640) return 2
  return 1
}

/** 分组内容区估高（含 bodyPad）；count=0 时只留 padding */
function estimateGroupHeight(
  variant: 'wall' | 'rail',
  count: number,
  cols: number = 1
): number {
  const size = CARD_SIZE[variant]
  const safeCount = Math.max(count, 0)
  if (safeCount === 0) return size.bodyPad

  const safeCols = Math.max(cols, 1)
  const rows = Math.ceil(safeCount / safeCols)
  return size.bodyPad + rows * size.minHeight + Math.max(rows - 1, 0) * size.gap
}

export { CARD_SIZE, estimateGroupHeight, findWallCols }
export type { CardSizeVariant }
