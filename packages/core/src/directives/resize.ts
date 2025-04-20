import type { Directive, DirectiveBinding } from 'vue'

const map = new WeakMap<WeakKey, (DOMRect: DOMRect) => void>()

const ob = new ResizeObserver(function (entries: ResizeObserverEntry[]) {
  for (const entry of entries) {
    const target = entry.target as HTMLElement
    const handler = map.get(target)
    const DOMRect: DOMRect = target.getBoundingClientRect()
    handler?.(DOMRect)
  }
})

export const resize: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
    map.set(el, binding.value)
    ob.observe(el)
  },
  beforeUnmount(el: HTMLElement) {
    ob.unobserve(el)
  }
}
