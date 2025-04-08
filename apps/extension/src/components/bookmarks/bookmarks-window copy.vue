<script setup lang="tsx">
// import { useMessage } from 'naive-ui'
import { useRefHistory, useMagicKeys, whenever } from '@vueuse/core'

import { ArrowBack, ArrowForward, Refresh, AddSharp, Close, Folder } from '@vicons/ionicons5'

import Fuse, { type IFuseOptions } from 'fuse.js'
import { initSortable } from './index.ts'

import { useBookmarksStore } from '@/stores/bookmarks'

import bookmarksJSON from './bookmarks.json'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'AppWindow'
})

withDefaults(
  defineProps<{
    appWindowRef?: AppWindowType
  }>(),
  {}
)

// const message = useMessage()

const bookmarkGridRef = useTemplateRef<HTMLElement>('bookmarkGridRef')

const bookmarksStore = useBookmarksStore()

const source = ref<BookmarkTreeNode>()
const target = ref<BookmarkTreeNode>()

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
  const bookmarksRes = bookmarksJSON.bookmarks as unknown as BookmarkTreeNode[]

  // console.log('bookmarksJSON', bookmarksJSON)

  bookmarks.value = bookmarksRes

  originalBookmarks.value = bookmarksRes

  shortcutBookmark.value = bookmarksRes

  if (bookmarkGridRef.value) {
    initSortable(bookmarkGridRef.value)
  }
})
</script>

<template>
  <div :class="['w-full h-full bookmark-window']">
    <a-button-group :class="['absolute top-[9px] right-2']">
      <a-button ghost circle size="small">
        <template #icon>
          <!-- <n-icon size="16"> -->
          <Close />
          <!-- </n-icon> -->
        </template>
      </a-button>
      <a-button ghost circle size="small">
        <template #icon>
          <!-- <n-icon size="16"> -->
          <Close />
          <!-- </n-icon> -->
        </template>
      </a-button>
      <a-button ghost circle size="small" @click="appWindowRef?.destroy">
        <template #icon>
          <!-- <n-icon size="16"> -->
          <Close />
          <!-- </n-icon> -->
        </template>
      </a-button>
    </a-button-group>
    <a-tabs animated type="card" placement="top" :addable="true" class="bookmarksTabs">
      <a-tab-pane name="oasis" tab="Oasis">
        <div class="navigationBar">
          <a-button-group>
            <a-button ghost :disabled="!canUndo || !history[1].snapshot.length" @click="undo">
              <template #icon>
                <!-- <n-icon> -->
                <ArrowBack />
                <!-- </n-icon> -->
              </template>
            </a-button>
            <a-button ghost :disabled="!canRedo" @click="redo">
              <template #icon>
                <!-- <n-icon> -->
                <ArrowForward />
                <!-- </n-icon> -->
              </template>
            </a-button>
            <a-button>
              <template #icon>
                <!-- <n-icon> -->
                <Refresh />
                <!-- </n-icon> -->
              </template>
            </a-button>
            <a-button>
              <template #icon>
                <!-- <n-icon> -->
                <AddSharp />
                <!-- </n-icon> -->
              </template>
            </a-button>
          </a-button-group>
          <div :class="['w-full flex items-center justify-center gap-x-2']">
            <a-input type="text" :class="['flex-nowrap flex-[3_1_0%]']"></a-input>
            <div :class="['flex-[2_1_0%] relative']">
              <a-input
                type="text"
                :model-value="keyword"
                placeholder="搜索书签"
                @update-value="updateSearchText"
              ></a-input>
            </div>
          </div>
        </div>
        <div class="navigationBar">
          <a-dropdown
            placement="bottomLeft"
            trigger="click"
            :show-arrow="true"
            @select="handleSelect"
          >
            <a-button>新建</a-button>
          </a-dropdown>
          <a-divider vertical />
          <a-button-group>
            <a-button ghost>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="Cut24Filled" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-button ghost>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="ContentCopyRound" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-button>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="ClipboardPaste24Regular" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-button round>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="Rename16Regular" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-button ghost>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="Share16Regular" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-button>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="TrashOutline" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
          </a-button-group>
          <a-divider vertical />
          <a-button-group>
            <a-button ghost>
              <!-- <n-icon size="16"> -->
              <!-- <SvgIcon name="ArrowSort20Filled" color="#000"></SvgIcon> -->
              <!-- </n-icon> -->
            </a-button>
            <a-dropdown
              placement="bottomLeft"
              trigger="click"
              :show-arrow="true"
              @select="handleSelect"
            >
              <a-button ghost>
                <!-- <n-icon size="16"> -->
                <!-- <SvgIcon name="ReorderFourOutline" color="#000"></SvgIcon> -->
                <!-- </n-icon> -->
              </a-button>
            </a-dropdown>
          </a-button-group>
        </div>
        <a-layout has-sider class="bookmark-main">
          <a-layout-sider bordered content-style="padding: 24px;" :class="['bookmark-sider']">
            <!-- <a-scrollbar class="bookmark-sider-scroll"> -->
            <a-button
              text
              :key="node.id"
              v-for="node in shortcutBookmark"
              @click="() => redirectBookmark(node)"
              :class="['sider-shortcut-item']"
            >
              <!-- <n-icon color="#ffd766" size="20"> -->
              <Folder />
              <!-- </n-icon> -->
              <span>{{ node.title }}</span>
            </a-button>
            <!-- </a-scrollbar> -->
          </a-layout-sider>

          <!-- <n-scrollbar> -->
          <div ref="bookmarkGridRef" class="bookmarkGrid">
            <RenderBookmarkItem
              v-for="bookmark in bookmarks"
              :key="bookmark.id"
              :bookmark="bookmark"
            />
          </div>
          <!-- </n-scrollbar> -->
        </a-layout>
      </a-tab-pane>
      <a-tab-pane name="the beatles" tab="the Beatles">
        <!-- <n-scrollbar> -->
        bookmarks
        <pre> {{ JSON.stringify(bookmarks, null, 2) }}</pre>
        <!-- </n-scrollbar> -->
      </a-tab-pane>

      <a-tab-pane name="the beatles1" tab="the Beatles">
        <!-- <n-scrollbar> -->
        history
        <pre> {{ JSON.stringify(history, null, 2) }}</pre>
        <!-- </n-scrollbar> -->
      </a-tab-pane>
      <a-tab-pane name="the beatles2" tab="the Beatles"> Hey Jude </a-tab-pane>
      <a-tab-pane name="the beatles3" tab="the Beatles"> Hey Jude </a-tab-pane>
      <a-tab-pane name="the beatles4" tab="the Beatles"> Hey Jude </a-tab-pane>
      <a-tab-pane name="the beatles5" tab="the Beatles"> Hey Jude </a-tab-pane>
      <a-tab-pane name="the beatles6" tab="the Beatles"> Hey Jude </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style lang="scss" scoped>
/* 幽灵元素 - 原位置的占位符 */
:global(.bookmarkItem-ghost) {
}

/* 拖动中的元素 */
:global(.bookmarkItem-drag) {
  box-shadow: 0 0px 16px 3px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s linear;
}

/* 回退元素 - 用于不支持 HTML5 拖放的浏览器 */
:global(.bookmarkItem-fallback) {
}

/* 被选中的元素 */
:global(.bookmarkItem-chosen) {
  box-shadow: 0 16px 12px rgba(0, 0, 0, 0.15);
}

.bookmarksTabs {
  @apply w-full h-full;

  :deep(.n-tabs-nav) {
    @apply w-[calc(100%-98px)];

    .n-tabs-rail {
      @apply rounded-t-lg py-[6px] px-2;
    }
  }
  :deep(.n-tabs-pane-wrapper) {
    @apply h-full rounded-lg;

    .n-tab-pane {
      @apply h-full flex flex-col rounded-lg px-1;
    }
  }

  .navigationBar {
    @apply flex items-center gap-2 p-1;
  }

  .bookmarkGrid {
    @apply grid p-4;
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

.bookmark-main {
  .bookmark-sider {
  }

  :deep(.bookmark-sider-scroll) {
    .n-scrollbar-content {
      @apply flex flex-col gap-y-1;

      .sider-shortcut-item {
        .n-button__content {
          @apply w-full flex items-center justify-start gap-x-2;
        }
        span {
          @apply truncate;
        }
      }
    }
  }
  .sider-shortcut-item {
    :deep(.n-button__content) {
      @apply justify-center gap-x-2;
    }
  }
}
</style>
