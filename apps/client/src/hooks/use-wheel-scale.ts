import gsap from 'gsap'
import { useEffect, useRef } from 'react'

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
  const { rootRef, storeScale, storeOpacity = 1 } = options

  /** 当前实时 scale（GSAP 直写用） */
  const liveScaleRef = useRef(storeScale)
  /** 当前实时 opacity（Ctrl+滚轮用） */
  const liveOpacityRef = useRef(storeOpacity)
  /** debounce 定时器 */
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 同步 store 值到 ref（store 变化时重置）
  liveScaleRef.current = storeScale
  liveOpacityRef.current = storeOpacity

  const optsRef = useRef(options)
  optsRef.current = options

  const handler = useRef((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = rootRef.current
    if (!el) return

    const { onCommit: commit, onOpacityCommit: opCommit, step: s = 0.05, minScale: mn = 0.25, maxScale: mx = 4, opacityMin: oMn = 0.15, opacityMax: oMx = 1, opacityStep: oS = 0.05 } = optsRef.current

    // Ctrl+滚轮：调节 opacity
    if (e.ctrlKey && opCommit) {
      const delta = e.deltaY > 0 ? -oS : oS
      const next = Math.round(Math.min(oMx, Math.max(oMn, liveOpacityRef.current + delta)) * 100) / 100
      liveOpacityRef.current = next
      gsap.set(el, { opacity: next })

      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = setTimeout(function () {
        commitTimerRef.current = undefined
        opCommit(next)
      }, 200)
      return
    }

    // 普通滚轮：调节 scale
    const delta = e.deltaY > 0 ? -s : s
    const next = Math.round(Math.min(mx, Math.max(mn, liveScaleRef.current + delta)) * 100) / 100
    liveScaleRef.current = next
    gsap.set(el, { scale: next, transformOrigin: '50% 50%' })

    clearTimeout(commitTimerRef.current)
    commitTimerRef.current = setTimeout(function () {
      commitTimerRef.current = undefined
      commit(next)
    }, 200)
  })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      handler.current(e)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [rootRef])
}

export { useWheelScale }
export type { UseWheelScaleOptions }
