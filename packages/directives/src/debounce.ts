import type { Directive, DirectiveBinding } from 'vue'

/** 点击后禁用按钮一段时间；卸载时需要拿同一个引用才能解绑 */
const handlers = new WeakMap<HTMLElement, EventListener>()

export const debounce: Directive = {
  beforeMount(el: HTMLButtonElement, binding: DirectiveBinding<number>) {
    const handler: EventListener = function () {
      if (el.disabled) return

      el.disabled = true

      const delay = binding.value || 2 * 1000

      setTimeout(function () {
        el.disabled = false
      }, delay)
    }

    handlers.set(el, handler)
    el.addEventListener('click', handler)
  },
  unmounted(el: HTMLButtonElement) {
    const handler = handlers.get(el)
    if (!handler) return

    handlers.delete(el)
    el.removeEventListener('click', handler)
  }
}
