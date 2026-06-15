import { useEffect, useRef } from 'react'

type ResizeCallback = (rect: DOMRectReadOnly) => void

// 1. 创建全局的 ResizeObserver（单例！）
const observe = new ResizeObserver(function (entries) {
  for (const entry of entries) {
    const target = entry.target as HTMLElement
    const handler = handlers.get(target)
    const DOMRect: DOMRectReadOnly = entry.contentRect
    handler?.(DOMRect)
  }
})

// 2. 用 WeakMap 存储元素和回调（关键！）
const handlers = new WeakMap<HTMLElement, ResizeCallback>()

function useResize<T extends HTMLElement>(callback: ResizeCallback) {
  const ref = useRef<T>(null)

  useEffect(
    function () {
      const node = ref.current
      if (!node) return

      handlers.set(node, callback)
      observe.observe(node)

      return function () {
        handlers.delete(node)
        observe.unobserve(node)
      }
    },
    [callback]
  )

  return ref
}

export { useResize }
