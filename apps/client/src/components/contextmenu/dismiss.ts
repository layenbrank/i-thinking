import { useEffect, useRef } from 'react'

const PANEL_CLASS = 'contextmenu-panel'
const DISMISS_GRACE_MS = 16

function isInsideMenu(event: Event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!(node instanceof Element)) continue
    if (node.classList.contains(PANEL_CLASS)) return true
  }
  const target = event.target
  if (!(target instanceof Node)) return false
  const panels = document.querySelectorAll(`.${PANEL_CLASS}`)
  for (const panel of panels) {
    if (panel.contains(target)) return true
  }
  return false
}

interface UseDismissOptions {
  isOpen: boolean
  onClose: () => void
  graceMs?: number
}

function useDismiss(options: UseDismissOptions) {
  const { isOpen, onClose, graceMs = DISMISS_GRACE_MS } = options
  const openedAtRef = useRef(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(
    function () {
      if (!isOpen) return
      openedAtRef.current = Date.now()

      function onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return
        if (Date.now() - openedAtRef.current < graceMs) return
        if (isInsideMenu(event)) return
        onCloseRef.current()
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') onCloseRef.current()
      }

      function onResize() {
        onCloseRef.current()
      }

      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeyDown, true)
      window.addEventListener('resize', onResize)
      return function () {
        document.removeEventListener('pointerdown', onPointerDown)
        document.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('resize', onResize)
      }
    },
    [isOpen, graceMs]
  )
}

export { isInsideMenu, useDismiss, DISMISS_GRACE_MS, PANEL_CLASS }
