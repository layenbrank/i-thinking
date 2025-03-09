import Sortable from 'sortablejs'

export function initSortable(el: HTMLElement) {
  Sortable.create(el, {
    sort: true,
    animation: 300,
    group: {
      name: 'bookmark'
      // pull: 'clone',
      // put: true
    },
    swapThreshold: 0.05,
    dataIdAttr: 'data-bookmark-id',
    ghostClass: 'bookmarkItem-ghost',
    chosenClass: 'bookmarkItem-chosen',
    dragClass: 'bookmarkItem-drag',
    filter(event, target, sortable) {
      console.log('target', target)
      const bookmarkContent = target.classList.contains('.bookmarkContent')
      const bookmarkLink = target.classList.contains('.bookmarkItem-link')
      if (bookmarkContent) return false
      else if (bookmarkLink) return true
      else return false
    },
    store: {
      get(sortable: Sortable) {
        // console.log('get', sortable)

        return []
      },
      set(sortable: Sortable) {
        // console.log('set', sortable)
      }
    },
    onStart(event) {
      // console.log('onStart', event)
      const bookmarkItem = event.item.closest('.bookmarkItem') as HTMLElement
      const id = bookmarkItem.dataset.bookmarkId
      // if (id) {
      //   chrome.bookmarks.getSubTree(id, function (rs) {
      //     // console.log('rs', rs)
      //     rs.forEach(function (item) {
      //       item.id === id && (source.value = item)
      //     })
      //   })
      // }
      // console.log('onStart bookmarkItem', id)
    },
    onMove(evt, originalEvent) {
      // console.log('onMove', evt, originalEvent)
      const bookmarkItem = evt.related.closest('.bookmarkItem') as HTMLElement
      const id = bookmarkItem.dataset.bookmarkId

      // if (id && source.value?.id) {
      //   chrome.bookmarks.getSubTree(id, function (rs) {
      //     rs.forEach(function (item) {
      //       item.id === id && (target.value = item)
      //     })
      //   })
      //   // console.log('target', target.value)
      // }
      // console.log('onMove bookmarkItem', id)
    },
    onChange(evt) {
      const bookmarkItem = evt.item.closest('.bookmarkItem') as HTMLElement
      const id = bookmarkItem.dataset.bookmarkId

      // chrome.bookmarks.remove('0', function () {
      //   console.log('remove')
      // })
      // chrome.bookmarks.removeTree('0', function () {
      //   console.log('removeTree')
      // })
      // setTimeout(() => {
      //   chrome.bookmarks.create(
      //     {
      //       index: bookmarksStore.bookmarks[0].index ?? 0,
      //       title: bookmarksStore.bookmarks[0].title ?? '未命名',
      //       url: bookmarksStore.bookmarks[0].url ?? '',
      //     },
      //     function (rs) {
      //       console.log('create', rs)
      //       rs.children = bookmarksStore.bookmarks[0].children
      //     },
      //   )
      // }, 1000 * 5)
    },
    onUpdate(event) {
      // console.log('source', source.value)
      // console.log('target', target.value)
    }
  })
}
