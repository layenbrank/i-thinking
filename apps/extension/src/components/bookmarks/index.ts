import Sortable from 'sortablejs'

export function initSortable(el: HTMLElement) {
  Sortable.create(el, {
    sort: true,
    animation: 300,
    group: {
      name: 'bookmark',
      pull(to, from, dragEl, event) {
        return dragEl.classList.contains('bookmarkItem')
      },
      // put(to, from, dragEl, event) {
      //   return dragEl.classList.contains('bookmarkItem')
      // }
      put: false
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
    setData(dataTransfer, dragEl) {},
    onChoose(evt) {},
    onUnchoose(evt) {
      // evt.item.style.boxShadow = ''
      // evt.item.style.transition = ''
    },
    store: {
      get(sortable: Sortable) {
        return []
      },
      set(sortable: Sortable) {}
    },
    onStart(event) {
      const target = event.item as HTMLElement
      target.closest('.bookmarkItem')?.classList.remove('bookmarkItem-drag')
    },
    onEnd(event) {
      const target = event.item as HTMLElement
      target.closest('.bookmarkItem')?.classList.remove('bookmarkItem-drag')
    },
    onMove(evt, originalEvent) {
      // const bookmarkItem = evt.related.closest('.bookmarkItem') as HTMLElement
      // const id = bookmarkItem.dataset.bookmarkId
    },
    onChange(evt) {
      // const bookmarkItem = evt.item.closest('.bookmarkItem') as HTMLElement
      // const id = bookmarkItem.dataset.bookmarkId
    },
    onUpdate(event) {}
  })
}
