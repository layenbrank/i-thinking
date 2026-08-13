import gsap from 'gsap'
import { useEffect, useRef } from 'react'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

interface UseWheelScaleOptions {
  rootRef: React.RefObject<HTMLElement | null>
  storeScale: number
  storeX: number
  storeY: number
  /** 元素原始宽度（未缩放） */
  elWidth: number
  /** 元素原始高度（未缩放） */
  elHeight: number
  /** 舞台宽度（用于 clamp 边界） */
  boundsWidth: number
  /** 舞台高度（用于 clamp 边界） */
  boundsHeight: number
  minScale?: number
  maxScale?: number
  step?: number
  onCommit: (scale: number, x: number, y: number) => void
  /** Ctrl+滚轮回调（用于调节 opacity 等） */
  onOpacityCommit?: (opacity: number) => void
  /** 当前 opacity（配合 onOpacityCommit 使用） */
  storeOpacity?: number
  opacityMin?: number
  opacityMax?: number
  opacityStep?: number
}

function useWheelScale(options: UseWheelScaleOptions) {
  const { rootRef, storeScale, storeX, storeY, storeOpacity = 1 } = options

  /** 当前实时 scale（GSAP 直写用） */
  const liveScaleRef = useRef(storeScale)
  /** 当前实时 x/y（GSAP 直写用） */
  const liveXRef = useRef(storeX)
  const liveYRef = useRef(storeY)
  /** 当前实时 opacity（Ctrl+滚轮用） */
  const liveOpacityRef = useRef(storeOpacity)
  /** debounce 定时器 */
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 同步 store 值到 ref（store 变化时重置）
  liveScaleRef.current = storeScale
  liveXRef.current = storeX
  liveYRef.current = storeY
  liveOpacityRef.current = storeOpacity

  const optsRef = useRef(options)
  optsRef.current = options

  const handler = useRef((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = rootRef.current
    if (!el) return

    const {
      onCommit: commit,
      onOpacityCommit: opCommit,
      step: s = 0.05,
      minScale: mn = 0.25,
      maxScale: mx = 4,
      opacityMin: oMn = 0.15,
      opacityMax: oMx = 1,
      opacityStep: oS = 0.05,
      elWidth: ew,
      elHeight: eh,
      boundsWidth: bw,
      boundsHeight: bh
    } = optsRef.current

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

    // 普通滚轮：以鼠标位置为中心缩放
    const oldScale = liveScaleRef.current
    const delta = e.deltaY > 0 ? -s : s
    const newScale = Math.round(Math.min(mx, Math.max(mn, oldScale + delta)) * 100) / 100

    if (newScale === oldScale) return

    // 当前 GSAP 实际位置（x/y 是 transform: translate）
    const curX = Number(gsap.getProperty(el, 'x')) || 0
    const curY = Number(gsap.getProperty(el, 'y')) || 0

    // 鼠标在元素局部坐标系中的位置（相对于元素左上角，未缩放的坐标）
    // transformOrigin = '0 0'，所以 GSAP x/y 就是元素左上角在舞台中的位置
    const mousePointX = (e.clientX - curX) / oldScale
    const mousePointY = (e.clientY - curY) / oldScale

    // 缩放后调整位置，使鼠标下的内容点保持不动
    let newX = e.clientX - mousePointX * newScale
    let newY = e.clientY - mousePointY * newScale

    // 边界约束：缩放后的渲染尺寸为 ew*newScale × eh*newScale
    const renderedW = ew * newScale
    const renderedH = eh * newScale
    const maxX = Math.max(0, bw - renderedW)
    const maxY = Math.max(0, bh - renderedH)
    newX = clamp(newX, 0, maxX)
    newY = clamp(newY, 0, maxY)

    liveScaleRef.current = newScale
    liveXRef.current = newX
    liveYRef.current = newY

    gsap.set(el, { scale: newScale, x: newX, y: newY, transformOrigin: '0 0' })

    clearTimeout(commitTimerRef.current)
    commitTimerRef.current = setTimeout(function () {
      commitTimerRef.current = undefined
      commit(newScale, newX, newY)
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
