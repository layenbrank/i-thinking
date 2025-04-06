<script setup lang="tsx">
import { MacLayout, type MacLayoutOptions } from '@/layouts/index.ts'
import { ReDock } from '@/components/re-dock'
import { useDateFormat, useEventListener, useTimestamp } from '@vueuse/core'

const Bookmarks = defineAsyncComponent(() => import('@/components/bookmarks/index.vue'))
const Notepad = defineAsyncComponent(() => import('@/components/notepad/index.vue'))
const AppStore = defineAsyncComponent(() => import('@/components/app-store/index.vue'))

import SvgIcon from '@/components/SvgIcon.vue'

import backgroundImage from '@/assets/images/r2e391.png'

import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'

// enum ContextMenuKeys {
//   添加图标 = 'add-icon',
//   换壁纸 = 'change-wallpaper',
//   设为电脑壁纸 = 'pc-wallpaper',
//   备份到云端 = 'backup-cloud',
//   排序模式 = 'sorting-mode',
//   文件夹模式 = 'folder-mode',
//   布局 = 'layouts',
//   删除 = 'single-delete',
//   批量删除 = 'batch-deletion',
//   设置 = 'settings',
//   编辑 = 'single-edit',
//   新标签页打开 = 'new-tab-open',
//   释放 = 'release'
// }

type ContextMenuKeys =
  | 'add-icon'
  | 'change-wallpaper'
  | 'pc-wallpaper'
  | 'backup-cloud'
  | 'sorting-mode'
  | 'folder-mode'
  | 'layouts'
  | 'single-delete'
  | 'batch-deletion'
  | 'settings'
  | 'single-edit'
  | 'new-tab-open'
  | 'release'

interface MenuOptions {
  label: string
  key: ContextMenuKeys
  icon: Component | string
}

defineOptions({
  name: 'MacView'
})

const contextMenuRef = useTemplateRef('contextMenuRef')

const keyword = ref('')

const timestamp = useTimestamp({
  interval: 'requestAnimationFrame'
})

const date = useDateFormat(timestamp, 'MM-DD', {})

const week = useDateFormat(timestamp, 'ddd', {})

const time = useDateFormat(timestamp, 'HH:mm:ss', {
  customMeridiem(hours, minutes, isLowercase, hasPeriod) {
    return hours < 12 ? '上午' : '下午'
  }
})

const contextMenuClient = reactive({
  x: innerWidth - 200,
  y: 200
})

const contextMenuSize = reactive({
  width: 0,
  height: 0
})

const contextMenuVisible = ref(false)

const activeMenuKey = ref<ContextMenuKeys | null>(null)

const appModules: Component[] = [Bookmarks, Notepad, AppStore]

const macLayout = reactive<MacLayoutOptions>({
  macLayout: {
    style: {
      backgroundImage: `url(${backgroundImage})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundOrigin: 'content-box',
      backgroundClip: 'content-box',
      backgroundPosition: 'center'
    }
  },
  macContent: {}
})

const menuOptions = reactive<Array<MenuOptions>>([
  {
    label: '添加图标',
    key: 'add-icon',
    icon: markRaw(Add)
  },
  {
    label: '换壁纸',
    key: 'change-wallpaper',
    icon: markRaw(Download)
  },
  {
    label: '设为电脑壁纸',
    key: 'pc-wallpaper',
    icon: markRaw(Download)
  },
  {
    label: '备份至云端',
    key: 'backup-cloud',
    icon: markRaw(Cloud)
  },
  {
    label: '设置',
    key: 'settings',
    icon: markRaw(Settings)
  }
])

function openContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  setTimeout(() => {
    contextMenuClient.x = Math.min(e.clientX, innerWidth - contextMenuSize.width)
    contextMenuClient.y = Math.min(e.clientY, innerHeight - contextMenuSize.height)
    contextMenuVisible.value = true
  }, 60)
}

function closeContextMenu(e: MouseEvent) {
  contextMenuVisible.value = false
}
function updateActiveKey(value: MenuOptions) {
  activeMenuKey.value = value.key

  const contextMenuMap = new Map<ContextMenuKeys, () => void>([
    ['add-icon', () => {}],
    ['change-wallpaper', () => {}],
    ['pc-wallpaper', () => {}],
    ['backup-cloud', () => {}],
    ['sorting-mode', () => {}],
    ['settings', () => {}]
  ])

  contextMenuMap.get(value.key)?.()
}

function handleResize(DOMRect: DOMRect) {
  contextMenuSize.width = DOMRect.width
  contextMenuSize.height = DOMRect.height
}

function updateKeyword(value: string) {
  keyword.value = value
}

function updateSearch() {
  window.open(`https://cn.bing.com/search?q=${keyword.value}`, '_blank')
}

onMounted(() => {
  const contextMenu = contextMenuRef.value as HTMLElement

  contextMenu.addEventListener('contextmenu', openContextMenu)
  window.addEventListener('click', closeContextMenu, true)
  window.addEventListener('contextmenu', closeContextMenu, true)
})

onUnmounted(function () {
  const contextMenu = contextMenuRef.value as HTMLElement

  contextMenu?.removeEventListener('contextmenu', openContextMenu)
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('contextmenu', closeContextMenu)
})
</script>

<template>
  <MacLayout v-bind="macLayout">
    <template #header>
      <a-button-group>
        <a-button>
          a
          <!-- <template #icon>
            <n-icon size="20">
              <SvgIcon name="AppleFilled"></SvgIcon>
            </n-icon>
          </template> -->
        </a-button>
        <a-button> 镜像 </a-button>
        <a-button> 编辑 </a-button>
        <a-button> 显示 </a-button>
        <a-button> 窗口 </a-button>
        <a-button> 帮助 </a-button>
      </a-button-group>
      <a-button-group>
        <a-button>
          a
          <!-- <template #icon>
            <n-icon size="20">
              <SvgIcon name="Wifi"></SvgIcon>
            </n-icon>
          </template> -->
        </a-button>
        <a-button>
          a
          <!-- <template #icon>
            <n-icon size="20">
              <SvgIcon name="BatteryFullOutline"></SvgIcon>
            </n-icon>
          </template> -->
        </a-button>
        <a-popover placement="bottom" trigger="click" class="popover-input">
          <template #trigger>
            <a-button>
              a
              <!-- <template #icon>
                <n-icon size="20">
                  <SvgIcon name="Search"></SvgIcon>
                </n-icon>
              </template> -->
            </a-button>
          </template>
          <template #default>
            <a-input
              @keydown.enter="updateSearch"
              :model-value="keyword"
              @update-value="updateKeyword"
              round
              placeholder="请输入关键词!"
            />
          </template>
        </a-popover>
        <a-button>
          a
          <!-- <template #icon>
            <n-icon size="20">
              <SvgIcon name="mac-toggle"></SvgIcon>
            </n-icon>
          </template> -->
        </a-button>
        <a-button class="date-time">
          <span>{{ date }}</span>
          <span>{{ week }}</span>
          <span>{{ time }}</span>
        </a-button>
      </a-button-group>
    </template>
    <template #content>
      <div ref="contextMenuRef" class="app-controller">
        <!-- <template v-for="appModule in appModules" :key="appModule.name">
          <component :is="appModule" />
        </template> -->
      </div>
      <Teleport to="body">
        <ul v-resize="handleResize" class="globalMenu context-menu" @contextmenu.prevent>
          <li
            v-for="item in menuOptions"
            :key="item.key"
            class="context-menu-item shortcut-label"
            @click="updateActiveKey(item)"
          >
            <span class="shortcut-label-text">
              {{ item.label }}
            </span>
            <component :is="item.icon" class="shortcut-label-icon" />
          </li>
        </ul>
      </Teleport>
    </template>
    <template #footer>
      <ReDock />
    </template>
  </MacLayout>
</template>

<style lang="scss" scoped>
:deep(.mac-layout) {
  @apply bg-transparent;
}

:deep(.mac-header) {
  @apply flex items-center justify-between px-2 rounded-lg bg-white bg-opacity-30 bg-transparent;
  backdrop-filter: blur(12px);
  filter: brightness(1.1);

  .date-time {
    .n-button__content {
      @apply flex items-center justify-center gap-x-2;
    }
  }

  .n-button-group {
    .n-button {
      --n-wave-opacity: 0 !important;
    }
  }
}

:deep(.mac-content) {
  @apply bg-transparent;

  .app-controller {
    @apply w-full h-full grid grid-cols-[repeat(auto-fill,70px)] grid-rows-[repeat(auto-fill,70px)] grid-flow-dense justify-center gap-3 rounded-lg;
  }
}

:deep(.mac-footer) {
  @apply h-20 flex items-center justify-center rounded-lg bg-white bg-opacity-30 bg-transparent;

  .dock {
    @apply h-fit;
  }
}

.context-menu {
  @apply w-[140px] min-w-32 flex flex-col items-center justify-center gap-y-[6px] z-[9999] fixed bg-[#0b0b0bcc] p-[6px] rounded-md border border-solid border-[#0a0a0a33];
  backdrop-filter: blur(8px);
  box-shadow:
    0 0 #0000,
    0 0 #0000,
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);

  left: v-bind('contextMenuClient.x+"px"');
  top: v-bind('contextMenuClient.y+"px"');
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: v-bind('contextMenuVisible ? 1 : 0');
  transform: scale(v-bind('contextMenuVisible ? 1 : 0'));
  transform-origin: 0 0;

  .context-menu-item {
    @apply w-full flex items-center justify-between text-white text-xs leading-none px-2 py-2 rounded-md cursor-pointer relative;

    &:hover {
      @apply bg-[#ffffff1a];
    }

    .shortcut-label-text {
    }

    .shortcut-label-icon {
      @apply w-4 h-4 text-white;
    }
  }
}
</style>
<style lang="scss">
div[class^='v-binder-follower-container'] {
  .v-binder-follower-content {
    .popover-input {
      @apply rounded-2xl;
      @apply bg-white bg-opacity-30;
      --n-padding: 0px !important;

      .n-popover-arrow-wrapper {
      }
      .n-popover-arrow {
        @apply bg-white bg-opacity-30;
      }
      .n-popover__content {
      }
      .n-input:not(.n-input--disabled).n-input--focus {
        @apply bg-transparent;
      }
      .n-input {
        width: clamp(300px, 80%, 500px);
        @apply bg-transparent;
        --n-border: 0px solid transparent !important;
        --n-border-focus: 0px solid transparent !important;
        --n-border-hover: 0px solid transparent !important;
        --n-box-shadow-focus: 0px 0px 0px transparent !important;
      }

      .n-input-wrapper {
      }
      .n-input__input {
        @apply text-black;
      }
      .n-input__placeholder {
        --n-placeholder-color: rgba(0, 0, 0, 0.6);
      }
    }
  }
}
</style>
