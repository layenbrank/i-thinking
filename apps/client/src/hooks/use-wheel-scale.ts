import gsap from 'gsap'
import { useCallback, useRef } from 'react'

interface UseWheelScaleOptions {
  rootRef: React.RefObject<HTMLElement | null>
  storeScale: number
  minScale?: number
  maxScale?: number
  step?: number
  onCommit: (scale: number) => void
  /** Ctrl+滚轮回调（用于调节 opacity 等） */
  onOpacityCommit?: (opacity: number) => void
  /** 当前 opacity（配合 onOpacityCommit 使用） */
  storeOpacity?: number
  opacityMin?: number
  opacityMax?: number
  opacityStep?: number
}

function useWheelScale(options: UseWheelScaleOptions) {
  const {
    rootRef,
    storeScale,
    minScale = 0.25,
    maxScale = 4.0,
    step = 0.05,
    onCommit,
    onOpacityCommit,
    storeOpacity = 1,
    opacityMin = 0.15,
    opacityMax = 1,
    opacityStep = 0.05
  } = options

  /** 当前实时 scale（GSAP 直写用） */
  const liveScaleRef = useRef(storeScale)
  /** 当前实时 opacity（Ctrl+滚轮用） */
  const liveOpacityRef = useRef(storeOpacity)
  /** debounce 定时器 */
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 同步 store 值到 ref（store 变化时重置）
  liveScaleRef.current = storeScale
  liveOpacityRef.current = storeOpacity

  const handleWheel = useCallback(
    function (e: React.WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      const el = rootRef.current
      if (!el) return

      // Ctrl+滚轮：调节 opacity
      if (e.ctrlKey && onOpacityCommit) {
        const delta = e.deltaY > 0 ? -opacityStep : opacityStep
        const next = Math.round(Math.min(opacityMax, Math.max(opacityMin, liveOpacityRef.current + delta)) * 100) / 100
        liveOpacityRef.current = next
        gsap.set(el, { opacity: next })

        clearTimeout(commitTimerRef.current)
        commitTimerRef.current = setTimeout(function () {
          commitTimerRef.current = undefined
          onOpacityCommit(next)
        }, 200)
        return
      }

      // 普通滚轮：调节 scale
      const delta = e.deltaY > 0 ? -step : step
      const next = Math.round(Math.min(maxScale, Math.max(minScale, liveScaleRef.current + delta)) * 100) / 100
      liveScaleRef.current = next
      gsap.set(el, { scale: next, transformOrigin: '50% 50%' })

      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = setTimeout(function () {
        commitTimerRef.current = undefined
        onCommit(next)
      }, 200)
    },
    [rootRef, minScale, maxScale, step, onCommit, onOpacityCommit, opacityMin, opacityMax, opacityStep]
  )

  return handleWheel
}

export { useWheelScale }
export type { UseWheelScaleOptions }
