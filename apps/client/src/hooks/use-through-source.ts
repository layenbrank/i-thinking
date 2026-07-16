import { invoke } from '@tauri-apps/api/core'
import { useEffect, useRef, type RefObject } from 'react'

type ThroughRect = { x: number; y: number; w: number; h: number }

/**
 * Report interactive hit-rects for one overlay source to the Rust through worker.
 * Pass `enabled=false` to clear the source (e.g. pin click-through).
 */
export function useThroughSource(
  source: string,
  rootRef: RefObject<HTMLElement | null>,
  enabled = true
) {
  const sourceRef = useRef(source)
  sourceRef.current = source

  useEffect(
    function () {
      if (!enabled) {
        void invoke('through:update-rects', { source, rects: [] as ThroughRect[] }).catch(
          function () {}
        )
        return
      }

      const root = rootRef.current
      if (!root) return

      let frame = 0

      function sync() {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(function () {
          const el = rootRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          const rects: ThroughRect[] =
            r.width <= 0 || r.height <= 0
              ? []
              : [
                  {
                    x: Math.round(r.left),
                    y: Math.round(r.top),
                    w: Math.round(r.width),
                    h: Math.round(r.height)
                  }
                ]
          void invoke('through:update-rects', {
            source: sourceRef.current,
            rects
          }).catch(function () {})
        })
      }

      const ro = new ResizeObserver(sync)
      ro.observe(root)

      const mo = new MutationObserver(sync)
      mo.observe(root, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style', 'class']
      })

      sync()
      return function () {
        cancelAnimationFrame(frame)
        ro.disconnect()
        mo.disconnect()
        void invoke('through:update-rects', {
          source: sourceRef.current,
          rects: [] as ThroughRect[]
        }).catch(function () {})
      }
    },
    [enabled, rootRef, source]
  )
}
