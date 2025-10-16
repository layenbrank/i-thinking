import type { Directive, DirectiveBinding } from 'vue'

export const debounce: Directive = {
	beforeMount(el: HTMLButtonElement, binding: DirectiveBinding<number>) {
		el.addEventListener('click', function () {
			if (el.disabled) return

			el.disabled = true

			const delay = binding.value || 2 * 1000

			setTimeout(function () {
				el.disabled = false
			}, delay)
		})
	},
	unmounted(el: HTMLButtonElement) {
		el.removeEventListener('click', () => null)
	}
}
