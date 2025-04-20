<script setup lang="ts">
import type { Component } from 'vue'
import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'
import { modules, appReflect } from './app-controller.tsx'
import type { SlideAppSize } from '@/types/slide-app.js'

type ContextMenuKeys =
  | 'update-app'
  | 'update-wallpaper'
  | 'update-backup'
  | 'update-layouts'
  | 'update-size'
  | 'single-delete'
  | 'batch-deletion'
  | 'settings'
  | 'single-edit'
  | 'new-tab'
  | 'release'

interface MenuOptions {
  label: string
  key: ContextMenuKeys
  icon: Component | string
}

type ContextMenuMap = Partial<Record<ContextMenuKeys, () => void>>

defineOptions({
  name: 'app-controller'
})

const contextMenuRef = useTemplateRef('contextMenuRef')

const contextMenuClient = reactive({
  x: innerWidth - 200,
  y: 200
})

const contextMenuSize = reactive({
  width: 0,
  height: 0
})

const contextMenuVisible = ref(false)

const activeApp = ref<string>()

const activeMenuKey = ref<ContextMenuKeys | null>(null)

const menuOptions = reactive<Array<MenuOptions>>([
  {
    label: '添加应用',
    key: 'update-app',
    icon: markRaw(Add)
  },
  {
    label: '更新大小',
    key: 'update-size',
    icon: markRaw(Add)
  },
  {
    label: '更新布局',
    key: 'update-layouts',
    icon: markRaw(Add)
  },
  {
    label: '更换壁纸',
    key: 'update-wallpaper',
    icon: markRaw(Download)
  },
  {
    label: '备份云端',
    key: 'update-backup',
    icon: markRaw(Cloud)
  },
  {
    label: '设置',
    key: 'settings',
    icon: markRaw(Settings)
  }
])

const sizes: SlideAppSize[] = ['small', 'medium', 'large', 'huge', 'massive', 'ultra']

function updateActiveKey(value: MenuOptions) {
  activeMenuKey.value = value.key

  const contextMenuMap: ContextMenuMap = {
    'update-app'() {},
    'update-size'() {
      // modules.value = modules.value.map((item) => {
      //   if (item.id === activeApp.value) item.size = sizes[Math.floor(Math.random() * sizes.length)]
      //   return item
      // })

      // for (const module of modules.value) {
      //   if (module.id !== activeApp.value) return
      //   module.size = sizes[Math.floor(Math.random() * sizes.length)]
      // }

      for (const index in modules.value) {
        if (!Object.prototype.hasOwnProperty.call(modules.value, index)) return
        const module = modules.value[index]

        if (module.id !== activeApp.value) continue
        module.size = sizes[Math.round(Math.random() * sizes.length)]
      }
    },
    'update-wallpaper'() {},
    'update-backup'() {},
    settings() {}
  }

  // contextMenuMap.get(value.key)?.()
  return contextMenuMap[value.key]?.()
}

function handleResize(DOMRect: DOMRect) {
  contextMenuSize.width = DOMRect.width
  contextMenuSize.height = DOMRect.height
}

function openContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  const target = e.target as HTMLElement
  const appItem = target.closest('.app-item') as HTMLElement

  setTimeout(() => {
    contextMenuClient.x = Math.min(e.clientX, innerWidth - contextMenuSize.width)
    contextMenuClient.y = Math.min(e.clientY, innerHeight - contextMenuSize.height)
    contextMenuVisible.value = true
    activeApp.value = appItem?.dataset.id
  }, 60)
}

function closeContextMenu(e: MouseEvent) {
  contextMenuVisible.value = false
}

onMounted(function () {
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
  <div ref="contextMenuRef" class="app-controller">
    <TransitionGroup name="app-controller-fade">
      <template v-for="appModule in modules" :key="appModule.id">
        <component :app="appModule" :is="appReflect[appModule.app]()" :class="['app-item']" />
      </template>
    </TransitionGroup>
    <Teleport to="body">
      <ul v-resize="handleResize" class="globalMenu context-menu" @contextmenu.prevent>
        <li
          v-for="item in menuOptions"
          :key="item.key"
          class="context-menu-item shortcut-label"
          @click="updateActiveKey(item)"
        >
          <span class="label-text">
            {{ item.label }}
          </span>
          <component :is="item.icon" class="label-icon" />
        </li>
      </ul>
    </Teleport>
    <Teleport to="body">
      <a-drawer :visible="false"></a-drawer>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-controller {
  // @apply w-full h-full grid grid-cols-[repeat(auto-fill,70px)] grid-rows-[repeat(auto-fill,70px)] grid-flow-dense justify-center gap-3 rounded-lg;
  @apply mx-auto grid justify-center p-5;
  // @apply overflow-x-hidden overflow-y-scroll;
  // @apply grid-flow-dense;
  // @apply grid-flow-col-dense;
  @apply grid-flow-row-dense;

  outline: none;
  scrollbar-width: none;
  transition: all 500ms linear;
  row-gap: var(--app-global-row-gap, 30px);
  column-gap: var(--app-global-col-gap, 30px);
  // max-width: var(--app-container-max-width, 1250px);
  grid-template-rows: repeat(auto-fill, var(--app-global-height, 60px));
  grid-template-columns: repeat(auto-fill, var(--app-global-width, 60px));

  &-fade-move,
  &-fade-enter-active,
  &-fade-leave-active {
    transition: all 500ms cubic-bezier(0.455, 0.03, 0.515, 0.955);
  }
  &-fade-enter-from,
  &-fade-leave-to {
    opacity: 0;
    transform: scale(0, 0);
  }

  :deep(:where(.app-item)) {
    @apply relative cursor-pointer text-center;

    & > :where(div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])) {
      @apply w-full h-full transition-all;
    }

    & > span.app-name {
      @apply block truncate w-full mt-1;
      font-size: var(--app-global-text-size);
      color: var(--app-global-text-color);
    }

    & > .app-trash-icon {
      @apply w-5 h-5 absolute -top-[8px] -right-[8px] items-center justify-center bg-[#00000033] rounded-full p-[5px] transition-[background];
      @apply hidden;

      &:hover {
        @apply bg-[#d83030];
      }
    }
  }
}
.context-menu {
  @apply w-40 min-w-40 flex flex-col items-center justify-center gap-y-[6px] z-[9999] fixed bg-[#0b0b0bcc] p-[6px] rounded-md border border-solid border-[#0a0a0a33];
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
    @apply w-full flex items-center justify-between text-white text-xs leading-none px-2 py-2 rounded-[4px] cursor-pointer relative;

    &:hover {
      @apply bg-[#ffffff1a];
    }

    .label-text {
    }

    .label-icon {
      @apply w-4 h-4 text-white;
    }
  }
}
</style>
