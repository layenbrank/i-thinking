<script setup lang="ts">
import FallbackMark from '@/assets/feedback/fallback.png'
import { useMirrorStore } from '@/stores/mirror.ts'
import { timeSphere } from '@i-thinking/utils'
import { message } from 'ant-design-vue'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { debounce } from 'lodash-es'
import PlusOutlined from '~icons/ant-design/plus-outlined'
import ReloadOutlined from '~icons/ant-design/reload-outlined'
import CloseOutlined from '~icons/local/close'
import HandleOutlined from '~icons/local/handle'
import { useBookMark } from './use-bookmark.ts'

type Entry = Application.Bookmark.Entry
type Directory = Application.Bookmark.Directory
type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'bookmark-overlay'
})

const props = withDefaults(
  defineProps<{
    fullscreen: boolean
  }>(),
  {}
)

const emits = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:fullscreen', value: boolean): void
}>()

const store = useMirrorStore()

const keyword = ref('')
const loading = ref(false)
// const bookmarks = ref<Bookmark[]>([])
// const folders = ref<BookmarkFolder[]>([])
// const originalBookmarks = ref<Bookmark[]>([])
const recentFolder: Readonly<Directory> = {
  id: '9999',
  index: 9999,
  count: 0,
  title: '最近添加',
  createdAt: 0,
  updatedAt: 0
}

const {
  folders,
  bookmarks,
  activeFolder,
  sourceBookmarks,
  targetBookmarks,
  recentBookmarks,
  handleRefreshBookmarks
} = useBookMark()

// 定义 Fuse 搜索选项
// const fuseOptions: IFuseOptions<BookmarkTreeNode> = {
const fuseOptions: IFuseOptions<Entry> = {
  keys: ['title', 'url'], // 搜索的字段
  threshold: 0.3, // 匹配阈值，0.0 表示完全匹配，1.0 表示完全不匹配
  includeScore: true, // 包含分数
  includeMatches: true, // 包含匹配信息
  minMatchCharLength: 1 // 最小匹配字符长度
}

function updateKeyword(value: string) {
  keyword.value = value.trim().trimStart().trimEnd()

  updateBookmarks(keyword.value)
}

const updateBookmarks = debounce(function (value: string) {
  // 如果搜索关键词为空，恢复显示所有书签
  if (!value) targetBookmarks.value = sourceBookmarks.value
  else {
    // 创建 Fuse 实例
    const fuse = new Fuse(bookmarks.value ?? [], fuseOptions)

    // 执行搜索
    const response = fuse.search(value)

    // 更新显示的书签列表 过滤掉相关度太低的结果
    targetBookmarks.value = response
      .filter((bookmark) => bookmark.score && bookmark.score < 0.6)
      .map((bookmark) => bookmark.item)
  }

  console.log('bookmarks', value, targetBookmarks.value)
}, 300)

function updateApplication(bookmark: Entry) {
  const raw = toRaw(bookmark)
  if (!store.mirrorID) return message.error('未选择镜像，无法添加应用')

  try {
    void store.toInsertApplication([
      {
        collectionID: null,
        id: raw.id,
        title: raw.title,
        url: raw.url,
        index: store.applications?.length ?? 0,
        component: 'navigation',
        mark: raw.url,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        round: '8px',
        mirrorID: store.mirrorID,
        textColor: '#fff',
        textSize: '16px',
        description: '',
        downloadCount: 0,
        background: null,
        backdrop: null
      }
    ])
    console.log('bookmark raw', raw)
    message.success(`已添加 ${raw.title} 到应用列表`)
  } catch {
    console.error('Error updating application:', raw)
    message.error(`添加 ${raw.title} 到应用列表失败`)
  }
}

function updateActiveFolder(folder: Directory) {
  if (folder.id === '9999')
    return (targetBookmarks.value = recentBookmarks.value)
  activeFolder.value = folder
  targetBookmarks.value = sourceBookmarks.value
}

function updateSort() {
  // void
}
function updateFullScreen() {
  emits('update:fullscreen', !props.fullscreen)
}
function updateVisible() {
  emits('update:visible', false)
}
</script>

<template>
  <a-spin
    :spinning="loading"
    wrapper-class-name="bookmark-overlay">
    <a-layout-sider
      :width="286"
      class="bookmark-sider">
      <a-layout-header class="sider-header">
        <span class="bookmark-tip">书签管理器</span>
        <a-button
          @click="updateSort"
          class="sort-button">
          <plus-outlined
            stroke-width="90"
            stroke="currentColor"
            width="1.25rem"
            height="1.25rem" />
        </a-button>
      </a-layout-header>
      <a-layout-content class="sider-content">
        <div class="folder-list">
          <div
            @click="updateActiveFolder(recentFolder)"
            :class="['folder', 'is-recent']">
            <a-image
              :preview="false"
              wrapper-class-name="folder-image"></a-image>
            <span class="folder-title">最近添加</span>
            <span class="folder-count">
              {{ recentBookmarks?.length }}
            </span>
          </div>
          <div
            @click="updateActiveFolder(folder)"
            v-for="folder in folders"
            :key="folder.id"
            :class="[
              'folder',
              {
                'is-active': activeFolder?.id === folder.id
              }
            ]">
            <a-image
              :preview="false"
              wrapper-class-name="folder-image"></a-image>
            <span class="folder-title">{{ folder.title }}</span>
            <span class="folder-count">
              {{ folder.count }}
            </span>
          </div>
        </div>
      </a-layout-content>
    </a-layout-sider>
    <a-layout class="bookmark-main">
      <a-layout-header class="main-header">
        <span class="bookmark-folder-title">全部书签</span>
        <a-input
          placeholder="搜索书签..."
          :value="keyword"
          @update:value="updateKeyword"
          class="bookmark-search"></a-input>
        <a-button-group class="bookmark-operation">
          <a-button
            @click="handleRefreshBookmarks"
            class="bookmark-operation-button refresh-button">
            <reload-outlined
              stroke-width="90"
              stroke="currentColor"
              width="1.25rem"
              height="1.25rem" />
          </a-button>
          <a-button
            @click="updateFullScreen"
            class="bookmark-operation-button fullscreen-button">
            <handle-outlined
              width="1.25rem"
              height="1.25rem" />
          </a-button>
          <a-button
            @click="updateVisible"
            class="bookmark-operation-button close-button">
            <close-outlined
              width="1.25rem"
              height="1.25rem" />
          </a-button>
        </a-button-group>
      </a-layout-header>
      <a-layout-content class="main-content">
        <div class="grid-view">
          <div class="bookmark-grid">
            <a-card
              @click="updateApplication(bookmark)"
              v-for="bookmark in targetBookmarks"
              :key="bookmark.id"
              class="bookmark-card">
              <a-image
                :preview="false"
                src="https://www.api.example.com/api/v1/image/1234567890.png"
                :fallback="FallbackMark"
                wrapper-class-name="bookmark-image"></a-image>
              <div class="bookmark-text">
                <span class="bookmark-title">
                  {{ bookmark.title }}
                </span>
                <span class="bookmark-time">
                  {{ timeSphere.format(bookmark.updatedAt, 'YYYY-MM-DD') }}
                </span>
              </div>
            </a-card>
          </div>
        </div>
      </a-layout-content>
    </a-layout>
  </a-spin>
</template>

<style lang="scss" scoped>
.bookmark-overlay {
  @apply w-full h-full;
  $height: 64px;
  $color: #2482ff;

  :deep(.ant-spin-container) {
    @apply w-full h-full flex items-center justify-center;
  }

  .bookmark-sider {
    height: 100%;
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    border-top-left-radius: var(--application-global-overlay-round, 8px);
    border-bottom-left-radius: var(--application-global-overlay-round, 8px);
    background-color: rgba($color: #ffffff, $alpha: 1);

    :deep(.ant-layout-sider-children) {
      @apply w-full h-full;
    }

    .sider-header {
      height: $height;
      @apply flex items-center bg-transparent px-5 py-6;
      box-shadow: 0px 1px 0px 0px #0000001a;
    }

    .bookmark-tip {
      @apply text-base font-bold text-nowrap;
    }

    .sort-button {
      @apply ml-auto;
      border: none;
      @apply w-5 h-5 flex items-center justify-center p-[5px] rounded-[10px] bg-[#0003] text-white;

      &:hover {
        @apply bg-[#00000099];
      }

      svg {
        @apply w-5 h-5;
      }
    }

    .sider-content {
      height: calc(100% - $height);
      @apply w-full py-5;
    }

    .folder-list {
      @apply w-full h-full overflow-x-hidden px-5 overflow-y-scroll flex flex-col gap-y-2;
    }

    .folder {
      @apply flex items-center gap-x-2 px-3 py-[10px] rounded-md cursor-pointer;

      &.is-active {
        background-color: rgba($color, $alpha: 0.3);
      }

      &.is-recent {
        background-color: rgba(#33cc66, $alpha: 0.3);
      }

      :deep(.folder-image) {
        @apply w-5 aspect-square bg-red-300;

        .ant-image-img {
          @apply w-full object-contain;
        }
      }

      .folder-title {
        @apply text-sm w-[calc(100%-96px)] truncate;
      }

      .folder-count {
        @apply w-[60px] text-xs text-right text-nowrap block;
      }
    }
  }

  .bookmark-main {
    height: 100%;
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    border-top-right-radius: var(--application-global-overlay-round, 8px);
    border-bottom-right-radius: var(--application-global-overlay-round, 8px);

    .main-header {
      height: $height;
      @apply flex items-center bg-transparent pl-8 pr-2 py-6 gap-x-2;
    }

    .bookmark-folder-title {
      @apply text-base font-bold text-nowrap;
    }

    .bookmark-search {
      @apply w-[30%] ml-auto;
    }

    .bookmark-operation {
      @apply flex flex-row justify-end gap-x-2 p-2;

      .bookmark-operation-button {
        border: none;
        @apply w-5 h-5 flex items-center justify-center p-[5px] rounded-[10px] bg-[#0003];

        svg {
          @apply w-[8px] h-[8px];
        }
      }

      .refresh-button,
      .fullscreen-button {
        &:hover {
          @apply bg-[#00000099];
        }
      }

      .refresh-button {
        @apply text-white;

        svg {
          @apply w-5 h-5;
        }
      }

      .close-button {
        &:hover {
          @apply bg-[#d83030];
        }
      }
    }

    .main-content {
      height: calc(100% - $height);
      // background-color: rgba(#fcfeff, $alpha: 1);

      @apply py-6;
    }

    .grid-view {
      @apply w-full h-full overflow-x-hidden overflow-y-scroll px-6;
    }

    .bookmark-grid {
      @apply w-full grid gap-4;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .bookmark-card {
      @apply w-full h-full cursor-pointer;

      :deep(.ant-card-body) {
        @apply w-full h-full flex items-center justify-between px-2 py-3 gap-x-2;
      }
    }

    :deep(.bookmark-image) {
      @apply w-[30%] min-w-[30%] block;

      .ant-image-img {
        @apply w-full object-contain rounded-lg;
      }
    }

    .bookmark-text {
      @apply w-[calc(70%-16px)] h-full flex flex-col justify-between py-[2px];
    }

    .bookmark-title {
      @apply w-[80%] truncate;
    }

    .bookmark-time {
      @apply text-nowrap block;
    }
  }
}
</style>
