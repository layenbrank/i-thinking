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
  const [hasEntered, updateEntered] = useState(false)
  // enabled=false 直通：不靠 effect 点亮，少一轮提交
  const isActive = !enabled || hasEntered

  /**
   * 节点挂上时量一次：已在首屏内就当场点亮，避免「骨架 → 真内容」闪一帧。
   * 量在 ref 回调里（提交阶段）而不是 effect 里：effect 里 setState 会多一整轮提交，
   * 而首屏这一帧正是不该多等的时候。
   */
  function bindNode(node: HTMLDivElement | null): void {
    nodeRef.current = node
    if (!node || !enabled || hasEntered) return
    const rect = node.getBoundingClientRect()
    if (rect.top < window.innerHeight + 240 && rect.bottom > -240) {
      updateEntered(true)
    }
  }

  // 不在首屏内的：交给观察器，进带后再点亮并退订（回调是异步的，不算级联 setState）
  useEffect(
    function () {
      const node = nodeRef.current
      if (!enabled || hasEntered || !node) return

      const observer = new IntersectionObserver(
        function (entries) {
          if (!entries[0]?.isIntersecting) return
          updateEntered(true)
          observer.disconnect()
        },
        { root: null, rootMargin: ROOT_MARGIN, threshold: 0 }
      )
      observer.observe(node)
      return function () {
        observer.disconnect()
      }
    },
    [enabled, hasEntered]
  )

  return (
    <div
      ref={bindNode}
      className={cn(props.className)}
      style={!isActive && props.estimateHeight ? { minHeight: props.estimateHeight } : undefined}>
      {isActive ? props.children : (props.placeholder ?? null)}
    </div>
  )
}

export { ViewportGate }
