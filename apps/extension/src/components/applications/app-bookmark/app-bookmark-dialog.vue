<script setup lang="tsx">
import { useRefHistory, useMagicKeys, whenever } from '@vueuse/core'

import { ArrowBack, ArrowForward, Refresh, AddSharp, Close, Folder } from '@vicons/ionicons5'

import Fuse, { type IFuseOptions } from 'fuse.js'
import { initSortable } from './app-bookmark.ts'

import { useBookmarksStore } from '@/stores/bookmarks'

import bookmarkJSON from './bookmark.json'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'app-bookmark-dialog'
})

withDefaults(
  defineProps<{
    appDialogRef?: AppDialog
  }>(),
  {}
)

const bookmarkGridRef = useTemplateRef('bookmarkGridRef')

const bookmarksStore = useBookmarksStore()

const source = ref<BookmarkTreeNode>()
const target = ref<BookmarkTreeNode>()

const data = reactive(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'])
const value = ref(data[0])

const keyword = ref<string>('')

// const buildOptions: DropdownMixedOption[] = [
//   {
//     label: '文件夹',
//     key: 'folder'
//   },
//   {
//     label: '书签',
//     key: 'bookmark'
//   },
//   {
//     label: '快捷方式',
//     key: 'shortcut'
//   }
// ]

// const moreOptions: DropdownMixedOption[] = [
//   {
//     label: '超大图标',
//     key: 'hugeIcon'
//   },
//   {
//     label: '大图标',
//     key: 'largeIcon'
//   },
//   {
//     label: '中图标',
//     key: 'mediumIcon'
//   },
//   {
//     label: '小图标',
//     key: 'smallIcon'
//   },
//   {
//     label: '列表',
//     key: 'list'
//   },
//   {
//     label: '详细信息',
//     key: 'detail'
//   },
//   {
//     label: '平铺',
//     key: 'tile'
//   },
//   {
//     label: '内容',
//     key: 'content'
//   }
// ]

const bookmarks = ref<BookmarkTreeNode[]>([])

// 保存原始书签数据的ref
const originalBookmarks = ref<BookmarkTreeNode[]>([])

// const folderBookmark = ref<BookmarkTreeNode[]>([])

const shortcutBookmark = ref<BookmarkTreeNode[]>([])
// const cacheBookmark = ref<BookmarkTreeNode[]>([])

// 定义 Fuse 搜索选项
const fuseOptions: IFuseOptions<BookmarkTreeNode> = {
  keys: ['title', 'url'], // 搜索的字段
  threshold: 0.3, // 匹配阈值，0.0 表示完全匹配，1.0 表示完全不匹配
  includeScore: true, // 包含分数
  includeMatches: true, // 包含匹配信息
  minMatchCharLength: 1 // 最小匹配字符长度
}

const {
  undo,
  canUndo,
  undoStack,
  redo,
  canRedo,
  redoStack,
  last,
  history,
  isTracking,
  pause,
  reset,
  clear,
  resume,
  dispose,
  batch,
  commit
} = useRefHistory(bookmarks, {
  capacity: 10,
  deep: true,
  clone: true,
  flush: 'sync'
  // dump(v) {},
  // parse(v) {
  //   return v
  // },
})

const { Control_D } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    const keyMap: string[] = ['Enter', 'ArrowUp', 'ArrowDown', 'Control']

    for (const key of keyMap) {
      e.key === key && e.preventDefault()
    }

    // if (e.ctrlKey && e.type === 'keydown') {
    //   if (e.key === 'd') {
    //     e.preventDefault()
    //     e.stopPropagation()
    //   }
    // }
  }
})
whenever(Control_D, () => {
  console.log('Control_D', Control_D.value)
})

// 导航到指定书签文件夹
async function navigateToFolder(node: BookmarkTreeNode) {
  if (!node.children) return
  bookmarks.value = node.children.sort((a, b) => {
    if (a.dateGroupModified && b.dateGroupModified) {
      return b.dateGroupModified - a.dateGroupModified
    } else if (a.dateAdded && b.dateAdded) {
      return a.dateAdded - b.dateAdded
    }
    return 0
  })

  if (bookmarkGridRef.value) {
    initSortable(bookmarkGridRef.value)
  }
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function RenderBookmarkItem(props: { bookmark: BookmarkTreeNode }) {
  const isFolder = !!props.bookmark.children
  const timeToShow = isFolder ? props.bookmark.dateGroupModified : props.bookmark.dateAdded

  return (
    <div
      onMouseenter={handleMouseEnter}
      onMouseleave={handleMouseLeave}
      ref={el => {
        if (el) {
          initSortable(el as HTMLElement)
        }
      }}
      data-bookmark-id={props.bookmark.id}
      class={['bookmarkItem', isFolder ? 'bookmarkItem-folder' : 'bookmarkItem-link']}
      onClick={() => {
        if (isFolder) navigateToFolder(props.bookmark)
        else window.open(props.bookmark.url, '_blank')
      }}
    >
      <div class={['bookmarkContent', 'ignore-bookmark']}>
        <div class={['bookmarkIcon']}>{isFolder ? '📁' : '🔗'}</div>
        <div class={['bookmarkInfo']}>
          <div class={['bookmarkTitle']}>{props.bookmark.title ?? '未命名'}</div>
          {timeToShow && (
            <div class={['bookmarkTime']}>
              {isFolder ? '修改时间: ' : '添加时间: '}
              {formatDate(timeToShow)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function updateSearchText(value: string) {
  keyword.value = value.trim().trimStart().trimEnd()

  if (keyword.value) {
    // 创建 Fuse 实例
    const fuse = new Fuse(originalBookmarks.value, fuseOptions)

    // 执行搜索
    const searchResults = fuse.search(keyword.value)

    // 更新显示的书签列表
    bookmarks.value = searchResults
      .filter(result => result.score && result.score < 0.6) // 过滤掉相关度太低的结果
      .map(result => result.item)
  } else {
    // 如果搜索关键词为空，恢复显示所有书签
    bookmarks.value = originalBookmarks.value
  }

  console.log('bookmarks', keyword.value, bookmarks.value)
}

function handleSelect(key: string | number) {
  // message.info(String(key))
}

async function redirectBookmark(node: BookmarkTreeNode) {
  if (node.children) navigateToFolder(node)
  else window.open(node.url, '_blank')
}

/*
async function initSortable() {
  await nextTick()
  console.log('bookmarkGridRef', bookmarkGridRef.value)

  if (bookmarkGridRef.value) {

Sortable.create(bookmarkGridRef.value, {
  sort: true,
  animation: 300,
  group: {
    name: 'bookmark',
    pull: 'clone',
    put: false
  },
  swapThreshold: 0.05,
  dataIdAttr: 'data-bookmark-id',
  ghostClass: 'bookmarkItem-ghost',
  chosenClass: 'bookmarkItem-chosen',
  dragClass: 'bookmarkItem-drag',
  store: {
    get: function (_sortable: Sortable) {
console.log('get', sortable)
      return []
    },
    set: function (_sortable: Sortable) {
console.log('set', sortable)
    }
  },
  onStart(event) {
console.log('onStart', event)
    const bookmarkItem = event.item.closest('.bookmarkItem') as HTMLElement
    const id = bookmarkItem.dataset.bookmarkId
if (id) {
  chrome.bookmarks.getSubTree(id, function (rs) {
console.log('rs', rs)
    rs.forEach(function (item) {
      item.id === id && (source.value = item)
    })
  })
}
console.log('onStart bookmarkItem', id)
  },
  onMove(evt, originalEvent) {
console.log('onMove', evt, originalEvent)
    const bookmarkItem = evt.related.closest('.bookmarkItem') as HTMLElement
    const id = bookmarkItem.dataset.bookmarkId

if (id && source.value?.id) {
  chrome.bookmarks.getSubTree(id, function (rs) {
    rs.forEach(function (item) {
      item.id === id && (target.value = item)
    })
  })
  // console.log('target', target.value)
}
    // console.log('onMove bookmarkItem', id)
  },
  onChange(evt) {
    const bookmarkItem = evt.item.closest('.bookmarkItem') as HTMLElement
    const id = bookmarkItem.dataset.bookmarkId

chrome.bookmarks.remove('0', function () {
  console.log('remove')
})
chrome.bookmarks.removeTree('0', function () {
  console.log('removeTree')
})
setTimeout(() => {
  chrome.bookmarks.create(
    {
      index: bookmarksStore.bookmarks[0].index ?? 0,
      title: bookmarksStore.bookmarks[0].title ?? '未命名',
      url: bookmarksStore.bookmarks[0].url ?? '',
    },
    function (rs) {
      console.log('create', rs)
      rs.children = bookmarksStore.bookmarks[0].children
    },
  )
}, 1000 * 5)
  },
  onUpdate(event) {
console.log('source', source.value)
console.log('target', target.value)
  }
})
}
}
 */
// 将嵌套书签扁平化为一维数组
function recursion(nodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
  const result: BookmarkTreeNode[] = []

  function flatten(items: BookmarkTreeNode[]) {
    items.forEach(item => {
      // 深拷贝当前节点，避免修改原始数据
      const node = structuredClone(item)

      if (node.children && node.children.length > 0) {
        const children = node.children
        // 清空 children 属性，避免重复
        delete node.children
        delete node.parentId
        delete node.dateAdded
        delete node.dateGroupModified
        if (!node.url) {
          // 如果 url 为空，则删除 node 节点
          console.log('node', node)
          return flatten(children)
        }
        result.push(node)
        // 递归处理子节点
        flatten(children)
      } else {
        delete node.children
        delete node.parentId
        delete node.dateAdded
        delete node.dateGroupModified

        result.push(node)
      }
    })
  }

  flatten(nodes)

  return result
}

function handleMouseEnter(e: MouseEvent) {
  const target = e.target as HTMLElement
  target.closest('.bookmarkItem')?.classList.add('bookmarkItem-drag')
  // console.log('handleMouseEnter', target.closest('.bookmarkItem-drag'))
}
function handleMouseLeave(e: MouseEvent) {
  const target = e.target as HTMLElement
  target.closest('.bookmarkItem')?.classList.remove('bookmarkItem-drag')
}

onMounted(async function () {
  // const bookmarksRes = await chrome.bookmarks.getTree()
  const bookmarksRes = bookmarkJSON.bookmarks as unknown as BookmarkTreeNode[]

  // console.log('bookmarksJSON', bookmarksJSON)

  bookmarks.value = bookmarksRes

  originalBookmarks.value = bookmarksRes

  shortcutBookmark.value = bookmarksRes

  if (bookmarkGridRef.value) {
    initSortable(bookmarkGridRef.value)
  }

  // const bookmarksTree = await chrome.bookmarks.getTree()
  // console.log('bookmarksTree', bookmarksTree)

  function flattenBookmarks(bookmarks: BookmarkTreeNode[]): BookmarkTreeNode[] {
    const nodes: BookmarkTreeNode[] = []
    const stack: BookmarkTreeNode[] = [...bookmarks] // 初始化栈

    while (stack.length > 0) {
      const bookmark = stack.pop() // 弹出栈顶元素
      // 防止意外空值
      if (!bookmark) continue

      // 如果当前节点有子节点，则将其子节点压入栈中
      if (bookmark.children && bookmark.children.length > 0) {
        stack.push(...bookmark.children)
      }
      // 过滤条件：排除 id 为 '0' 的根节点 或 标题为空的项
      if (bookmark.id === '0') continue
      else if (!bookmark.title.trim()) continue

      // 将当前节点添加到结果中（不保留 children 属性，避免冗余） 解构移除 children 属性
      const { children, ...remains } = bookmark
      // 使用 unshift 来保持顺序
      nodes.unshift(remains)
    }

    return nodes
  }

  // 扁平化书签树
  const flattened = flattenBookmarks(bookmarks.value)
  console.log('flattened', flattened)
  bookmarks.value = flattened
})
</script>

<template>
  <div :class="['app-bookmark-dialog']">
    <a-layout-header class="boookmark-header">
      <a-space-compact block :class="['bookmark-space-compact']">
        <a-button type="primary" size="small" class="bookmark-button-compact">
          <template #icon>
            <Close />
          </template>
        </a-button>
        <a-button type="primary" size="small" class="bookmark-button-compact">
          <template #icon>
            <Close />
          </template>
        </a-button>
        <a-button
          @click="appDialogRef?.destroy"
          type="primary"
          size="small"
          class="bookmark-button-compact"
        >
          <template #icon>
            <Close />
          </template>
        </a-button>
      </a-space-compact>
      <a-segmented v-model:value="value" :options="data" class="h-full" />
    </a-layout-header>
    <a-layout-content class="boookmark-content">
      <div ref="bookmarkGridRef" class="bookmarkGrid">
        <template v-for="bookmark in bookmarks" :key="bookmark.id">
          <RenderBookmarkItem :bookmark="bookmark" />
        </template>
      </div>
    </a-layout-content>
  </div>
</template>

<style lang="scss" scoped>
.app-bookmark-dialog {
  @apply w-full h-full;

  .boookmark-header {
    @apply bg-blue-300 px-2 py-2 rounded-t-lg;
  }

  .bookmark-space-compact {
    @apply w-fit h-[32px] absolute right-2;
  }
  .bookmark-button-compact {
    @apply h-full flex items-center justify-center p-1;
    margin-inline-end: 0px;
  }

  .boookmark-content {
    @apply w-full h-[calc(100%-48px)] overflow-x-hidden overflow-y-scroll bg-white;

    .bookmarkGrid {
      @apply w-full grid p-4;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;

      :deep(.bookmarkItem) {
        @apply p-4 rounded-lg bg-white cursor-pointer;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);

        &.folder {
          @apply bg-blue-50 hover:bg-blue-100;
        }

        .bookmarkContent {
          @apply flex items-start gap-2;
        }

        .bookmarkIcon {
          @apply text-xl;
        }

        .bookmarkInfo {
          @apply flex-1 min-w-0;

          .bookmarkTitle {
            @apply text-base font-medium line-clamp-1;
          }

          .bookmarkTime {
            @apply text-xs text-gray-500 mt-1;
          }
        }
      }
    }
  }
}

/* 幽灵元素 - 原位置的占位符 */
:global(.bookmark-ghost) {
}

/* 拖动中的元素 */
:global(.bookmark-drag) {
  box-shadow: 0 0px 16px 3px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s linear;
}

/* 回退元素 - 用于不支持 HTML5 拖放的浏览器 */
:global(.bookmark-fallback) {
}

/* 被选中的元素 */
:global(.bookmark-chosen) {
  box-shadow: 0 16px 12px rgba(0, 0, 0, 0.15);
}
</style>
