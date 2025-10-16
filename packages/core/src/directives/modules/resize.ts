import type { Directive, DirectiveBinding } from 'vue'

const reflect = new WeakMap<WeakKey, (DOMRect: DOMRect) => void>()

const observe = new ResizeObserver(handler)

function handler(entries: ResizeObserverEntry[]) {
	for (const entry of entries) {
		const target = entry.target as HTMLElement
		const handler = reflect.get(target)
		const DOMRect: DOMRectReadOnly = entry.contentRect
		handler?.(DOMRect)
	}
}

export const resize: Directive = {
	mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
		reflect.set(el, binding.value)
		observe.observe(el)
	},
	beforeUnmount(el: HTMLElement) {
		observe.unobserve(el)
	}
}
