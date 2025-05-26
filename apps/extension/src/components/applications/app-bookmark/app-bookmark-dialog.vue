<script setup lang="ts">
import { debounce } from 'lodash-es'
import bookmarkJSON from './bookmark.json'
import fallback from '@/assets/feedback/fallback.png'
import { useSlidesStore } from '@/stores/slides.ts'

import Fuse, { type IFuseOptions } from 'fuse.js'
import { timeSphere } from '@desktop-widgets/core'
import type { SlideAppDialog } from '@/types/slide-app'
import { useBookMark, type BookmarkParse } from './use-bookmark.ts'
import type { Bookmark } from '@/database/bookmark/bookmark.entity.ts'
import type { BookmarkFolder } from '@/database/bookmark/folder.entity.ts'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'app-bookmark-dialog'
})

const props = withDefaults(
  defineProps<{
    appDialogRef?: SlideAppDialog
  }>(),
  {}
)

const slidesStore = useSlidesStore()

const keyword = ref('')
const loading = ref(false)
// const bookmarks = ref<Bookmark[]>([])
// const folders = ref<BookmarkFolder[]>([])
// const originalBookmarks = ref<Bookmark[]>([])
const { folders, activeFolder, sourceBookmarks, targetBookmarks, recentBookmarks } = useBookMark()

// 定义 Fuse 搜索选项
const fuseOptions: IFuseOptions<BookmarkTreeNode> = {
  keys: ['title', 'url'], // 搜索的字段
  threshold: 0.3, // 匹配阈值，0.0 表示完全匹配，1.0 表示完全不匹配
  includeScore: true, // 包含分数
  includeMatches: true, // 包含匹配信息
  minMatchCharLength: 1 // 最小匹配字符长度
}

async function updateKeyword(value: string) {
  keyword.value = value.trim().trimStart().trimEnd()

  updateBookmarks(keyword.value)
}

const updateBookmarks = debounce(function (value: string) {
  // 如果搜索关键词为空，恢复显示所有书签
  if (!value) targetBookmarks.value = sourceBookmarks.value
  else {
    // 创建 Fuse 实例
    const fuse = new Fuse(sourceBookmarks.value ?? [], fuseOptions)

    // 执行搜索
    const response = fuse.search(value)

    // 更新显示的书签列表 过滤掉相关度太低的结果
    targetBookmarks.value = response
      .filter((bookmark) => bookmark.score && bookmark.score < 0.6)
      .map((bookmark) => bookmark.item)
  }

  console.log('bookmarks', value, targetBookmarks.value)
}, 300)

function updateSlideApp(bookmark: Bookmark) {
  const bookmarkApp = toRaw(bookmark)
  slidesStore.updateSlideApp(bookmark.id, {
    name: bookmarkApp.title,
    url: bookmarkApp.url,
    shape: 'circle',
    size: 'mini',
    sort: slidesStore.slides?.length,
    direction: 'horizontal',
    app: 'app-web',
    icon: bookmarkApp.url
  })
}

function updateActiveFolder(folder: BookmarkFolder) {
  if (folder.id === '9999') return (targetBookmarks.value = recentBookmarks.value)
  activeFolder.value = folder
}

onMounted(function () {
  // const bookmarksRes = bookmarkJSON as unknown as BookmarkParse
  // bookmarks.value = bookmarksRes.bookmarks
  // folders.value = bookmarksRes.folders
  // sourceBookmarks.value = bookmarks.value
  // console.log('bookmarks', bookmarks.value)
  // console.log('folders', folders.value)
  // chrome?.bookmarks?.getTree((treeNodes) => {
  //   console.log('treeNodes', treeNodes)
  //   const bookmarkNodes = parseBookmarkTree(treeNodes)
  //   console.log('bookmarkNodes', bookmarkNodes)
  //   sourceBookmarks.value = bookmarkNodes.bookmarks
  //   folders.value = bookmarkNodes.folders
  // })
})
</script>

<template>
  <a-spin :spinning="loading" wrapper-class-name="app-bookmark-dialog">
    <a-layout-sider :width="286" class="bookmark-sider">
      <a-layout-header class="sider-header">
        <span class="bookmark-tip">书签管理器</span>
        <a-button class="sort-button">
          <IconEpPlus />
        </a-button>
      </a-layout-header>
      <a-layout-content class="sider-content">
        <div class="folder-list">
          <div
            @click="updateActiveFolder(folder)"
            v-for="folder in folders"
            :key="folder.id"
            :class="[
              'folder',
              {
                'is-active': activeFolder?.id === folder.id
              }
            ]"
          >
            <a-image :preview="false" wrapper-class-name="folder-image"></a-image>
            <span class="folder-title">{{ folder.folder }}</span>
            <span class="folder-count">
              {{ folder.count }}
            </span>
          </div>
          <div
            @click="
              updateActiveFolder({
                id: '9999',
                sort: 9999,
                count: 0,
                folder: '最近添加',
                createdAt: 0,
                updatedAt: 0
              })
            "
            :class="['folder', 'is-recent']"
          >
            <a-image :preview="false" wrapper-class-name="folder-image"></a-image>
            <span class="folder-title">最近添加</span>
            <span class="folder-count">
              {{ recentBookmarks?.length }}
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
          class="bookmark-search"
        ></a-input>
        <a-button-group class="bookmark-operation">
          <a-button class="bookmark-operation-button refresh-button">
            <IconEpRefresh />
          </a-button>
          <a-button class="bookmark-operation-button fullscreen-button">
            <IconLocalHandle />
          </a-button>
          <a-button class="bookmark-operation-button close-button">
            <IconLocalClose />
          </a-button>
        </a-button-group>
      </a-layout-header>
      <a-layout-content class="main-content">
        <div class="grid-view">
          <div class="bookmark-grid">
            <a-card
              @click="updateSlideApp(bookmark)"
              v-for="bookmark in targetBookmarks"
              :key="bookmark.id"
              class="bookmark-card"
            >
              <a-image
                :preview="false"
                src="https://www.api.example.com/api/v1/image/1234567890.png"
                :fallback="fallback"
                wrapper-class-name="bookmark-image"
              ></a-image>
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
.app-bookmark-dialog {
  @apply w-full h-full;
  $height: 64px;
  $color: #2482ff;

  :deep(.ant-spin-container) {
    @apply w-full h-full flex items-center justify-center;
  }

  .bookmark-sider {
    @apply h-full bg-white;

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
      @apply w-5 h-5 flex items-center justify-center p-[5px] rounded-[10px] bg-[#0003];

      svg {
        @apply w-[8px] h-[8px];
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
    @apply h-full;

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

      .close-button {
        &:hover {
          @apply bg-[#d83030];
        }
      }
    }

    .main-content {
      height: calc(100% - $height);
      background-color: rgba(#fcfeff, $alpha: 1);
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
      @apply w-full h-full;

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
