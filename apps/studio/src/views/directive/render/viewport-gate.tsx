import { cn } from 'cn'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * 可见区门闩：靠近视口才挂真实子树，远处只留占位（骨架 / 估高）。
 *
 * 一旦进过可见带就**保持挂载**（滞回进、不轻易卸），避免滚动时反复挂卸比一直挂着更贵。
 * `enabled=false` 时直通，给小列表用。
 */

const ROOT_MARGIN = '240px 0px'

interface Props {
  enabled?: boolean
  /** 未激活时的估高，稳住滚动条 */
  estimateHeight?: number
  placeholder?: ReactNode
  className?: string
  children: ReactNode
}

function ViewportGate(props: Props) {
  const enabled = props.enabled !== false
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [isActive, updateActive] = useState(!enabled)

  useEffect(
    function () {
      if (!enabled) {
        updateActive(true)
        return
      }

      const node = nodeRef.current
      if (!node) return

      // 已在首屏内：同步点亮，避免骨→真内容闪一帧
      const rect = node.getBoundingClientRect()
      if (rect.top < window.innerHeight + 240 && rect.bottom > -240) {
        updateActive(true)
        return
      }

      const observer = new IntersectionObserver(
        function (entries) {
          if (!entries[0]?.isIntersecting) return
          updateActive(true)
          observer.disconnect()
        },
        { root: null, rootMargin: ROOT_MARGIN, threshold: 0 }
      )
      observer.observe(node)
      return function () {
        observer.disconnect()
      }
    },
    [enabled]
  )

  return (
    <div
      ref={nodeRef}
      className={cn(props.className)}
      style={
        !isActive && props.estimateHeight
          ? { minHeight: props.estimateHeight }
          : undefined
      }>
      {isActive ? props.children : (props.placeholder ?? null)}
    </div>
  )
}

export { ViewportGate }
