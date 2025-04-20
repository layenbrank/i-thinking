import type { Directive, DirectiveBinding } from 'vue'

export const debounce: Directive = {
  beforeMount(el: HTMLButtonElement, binding: DirectiveBinding<number>) {
    el.addEventListener('click', function () {
      if (!el.disabled) {
        el.disabled = true
        setTimeout(
          () => {
            el.disabled = false
          },
          binding.value || 2 * 1000
        )
      }
    })
  },
  unmounted(el: HTMLButtonElement) {
    el.removeEventListener('click', () => null)
  }
}
