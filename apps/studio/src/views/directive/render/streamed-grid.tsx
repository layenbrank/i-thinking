import type { ReactNode } from 'react'

import { CARD_SIZE, type CardSizeVariant } from './card-size'
import { CardSkeleton } from './card-skeleton'
import { useStreamedCount } from './use-streamed-count'

/**
 * 分片网格：可见项先上，其余用骨架占位；浏览器侧再靠 `content-visibility` 跳过屏外绘制。
 */

interface Props<T> {
  items: readonly T[]
  /** 切排序 / 筛选时换 key，重新流式灌入 */
  resetKey: string | number
  chunkSize?: number
  gridClassName: string
  skeletonVariant?: CardSizeVariant
  /** 骨架最多铺几格，避免「未运行 55」拖出一屏骨 */
  skeletonCap?: number
  findKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
}

function StreamedGrid<T>(props: Props<T>) {
  const variant = props.skeletonVariant ?? 'wall'
  const skeletonCap = props.skeletonCap ?? props.chunkSize ?? 12
  const shown = useStreamedCount(props.items.length, props.resetKey, props.chunkSize)
  const pending = Math.min(Math.max(props.items.length - shown, 0), skeletonCap)
  const itemShell = `[content-visibility:auto] [contain-intrinsic-size:${CARD_SIZE[variant].intrinsic}]`

  return (
    <div className={props.gridClassName}>
      {props.items.slice(0, shown).map(function (item, index) {
        return (
          <div
            key={props.findKey(item, index)}
            className={itemShell}>
            {props.renderItem(item, index)}
          </div>
        )
      })}
      {Array.from({ length: pending }, function (_, index) {
        return (
          <CardSkeleton
            key={`skeleton-${props.resetKey}-${index}`}
            variant={variant}
          />
        )
      })}
    </div>
  )
}

export { StreamedGrid }
