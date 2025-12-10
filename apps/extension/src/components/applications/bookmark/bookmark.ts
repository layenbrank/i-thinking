import Sortable from 'sortablejs'

export function initSortable(el: HTMLElement) {
	const sortable = Sortable.create(el, {
		sort: true,
		animation: 300,
		group: {
			name: 'bookmark',
			pull(to, from, dragEl, event) {
				const target = to.el
				const source = dragEl
				const targetID = target.dataset.bookmarkId
				const sourceID = source.dataset.bookmarkId
				console.log('pull to', targetID)
				console.log('pull dragEl', sourceID)

				// console.log('pull', to, from, dragEl, event)
				return dragEl.classList.contains('bookmarkItem')
			},
			put(to, from, dragEl, event) {
				const target = to.el
				const source = dragEl
				const targetID = target.dataset.bookmarkId
				const sourceID = source.dataset.bookmarkId
				console.log('put to', targetID)
				console.log('put dragEl', sourceID)

				// console.log('put', to, from, dragEl, event)
				return dragEl.classList.contains('bookmarkItem')
			},
			// put: false,
			checkPull(sortable, activeSortable, dragEl, event) {
				console.log('checkPull', sortable, activeSortable, dragEl, event)
				return true
			},
			checkPut(sortable, activeSortable, dragEl, event) {
				console.log('checkPut', sortable, activeSortable, dragEl, event)
				return true
			}
			// put: false
		},
		dataIdAttr: 'data-bookmark-id',
		ghostClass: 'bookmarkItem-ghost',
		chosenClass: 'bookmarkItem-chosen',
		dragClass: 'bookmarkItem-drag',
		draggable: '.bookmarkItem',
		fallbackClass: 'bookmarkItem-fallback',
		// direction: 'vertical',
		scroll: true,
		invertSwap: true,
		swapThreshold: 0.05,
		fallbackOnBody: false,
		// setData(dataTransfer, dragEl) {},
		// onChoose(evt) {},
		onUnchoose(evt) {
			// evt.item.style.boxShadow = ''
			// evt.item.style.transition = ''
		},
		// store: {
		// 	get(sortable: Sortable) {
		// 		return []
		// 	},
		// 	set(sortable: Sortable) {}
		// },
		onStart(event) {
			const source = event.item
			source.closest('.bookmarkItem')?.classList.remove('bookmarkItem-drag')
			// console.log('source', source.closest('.bookmarkItem'))
		},
		onEnd(event) {
			const target = event.item
			// console.log('target', target.closest('.bookmarkItem'))
			target.closest('.bookmarkItem')?.classList.remove('bookmarkItem-drag')
		},
		onMove(evt, originalEvent) {
			// const bookmarkItem = evt.related.closest('.bookmarkItem') as HTMLElement
			// const id = bookmarkItem.dataset.bookmarkId
		},
		onChange(evt) {
			// const bookmarkItem = evt.item.closest('.bookmarkItem') as HTMLElement
			// const id = bookmarkItem.dataset.bookmarkId
		}
		// onUpdate(event) {}
	})
}
