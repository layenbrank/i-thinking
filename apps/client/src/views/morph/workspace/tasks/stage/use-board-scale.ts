import { useCallback, useEffect, useState } from 'react'

const BOARD_SCALE_MIN = 0.5
const BOARD_SCALE_MAX = 2
const BOARD_SCALE_STEP = 0.1
const BOARD_SCALE = 1

/**
 * 操作台页板预览缩放（Ctrl/Cmd+滚轮），独立于编辑器 morph.zoom。
 */
function useBoardScale() {
  const [boardScale, setBoardScale] = useState(BOARD_SCALE)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)

  const resetScale = useCallback(function () {
    setBoardScale(BOARD_SCALE)
  }, [])

  useEffect(
    function () {
      if (!root) return

      function onWheel(event: WheelEvent) {
        if (!event.ctrlKey && !event.metaKey) return
        event.preventDefault()
        const direction = event.deltaY > 0 ? -1 : 1
        setBoardScale(function (prev) {
          const next =
            Math.round((prev + direction * BOARD_SCALE_STEP) * 100) / 100
          return Math.min(BOARD_SCALE_MAX, Math.max(BOARD_SCALE_MIN, next))
        })
      }

      root.addEventListener('wheel', onWheel, { passive: false })
      return function () {
        root.removeEventListener('wheel', onWheel)
      }
    },
    [root]
  )

  return { boardScale, rootRef: setRoot, resetScale }
}

export {
  useBoardScale,
  BOARD_SCALE,
  BOARD_SCALE_MIN,
  BOARD_SCALE_MAX,
  BOARD_SCALE_STEP
}
