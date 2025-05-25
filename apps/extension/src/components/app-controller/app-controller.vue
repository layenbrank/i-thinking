<script setup lang="ts">
import AppMenu from '../app-menu/app-menu.vue'
// import AppDrawer from '../app-settings/app-settings.vue'
import { useSlidesStore } from '@/stores/slides.ts'
import Sortable from 'sortablejs'

import {
  sizes,
  appReflect,
  contextmenuReflect
  // type MenuOptions,
  // type ContextMenuMap,
  // type ContextMenuKeys
} from './app-controller.tsx'
import type { AppReflect } from '@/types/app-controller'
import type { SlideApp, SlideAppName, SlideAppSize } from '@/types/slide-app.d.ts'
import type { ContextMenuKeys, ContextMenuMap, MenuOptions } from '@/types/app-menu'

defineOptions({
  name: 'app-controller'
})

const slidesStore = useSlidesStore()

const { slides, activeSlideApp, settingsVisible } = storeToRefs(slidesStore)

const contextmenuRef = useTemplateRef('contextmenuRef')
const appControllerRef = useTemplateRef('appControllerRef')

// const activeApp = ref<SlideApp | null>(null)

const contextmenuVisible = ref(false)

const activeMenuKey = ref<ContextMenuKeys | null>(null)

// const settingsVisible = ref(false)

const contextmenuRect = reactive({
  x: innerWidth - 200,
  y: 200,
  width: 0,
  height: 0
})

const contextmenuMap: Readonly<ContextMenuMap> = {
  'update-app'() {},
  'update-size'() {
    for (const index in slidesStore.slides) {
      if (!Object.prototype.hasOwnProperty.call(slidesStore.slides, index)) return

      const slide = slidesStore.slides[Number(index)]

      if (slide.id !== activeSlideApp.value?.id) continue
      slide.size = sizes[Math.round(Math.random() * sizes.length)]
    }
  },
  'update-wallpaper'() {},
  'update-backup'() {},
  'update-settings'() {
    settingsVisible.value = true
  }
}

const menuOptions = computed(() => {
  const active = slidesStore.slides?.find((slide) => slide.id === activeSlideApp.value?.id)

  console.log('active', active)

  if (!active) return []

  return contextmenuReflect[active.app]()
})

function updateActiveKey(value: MenuOptions) {
  activeMenuKey.value = value.key

  contextmenuMap[value.key]?.()
}

function handleController(e: MouseEvent) {
  const target = e.target as HTMLElement
  const slideApp = target.closest('.slide-app') as HTMLElement

  console.log('slideApp', slideApp)

  if (!settingsVisible.value) return
  if (!slideApp?.dataset?.id) return
  activeSlideApp.value =
    slidesStore.slides?.find((slide) => slide.id === slideApp.dataset.id) ?? null
}

function openContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  if (settingsVisible.value) return

  const target = e.target as HTMLElement
  const slideApp = target.closest('.slide-app') as HTMLElement

  const contextmenu = contextmenuRef.value?.$el as HTMLElement

  setTimeout(() => {
    if (!contextmenu) return
    contextmenuRect.width = contextmenu.clientWidth
    contextmenuRect.height = contextmenu.clientHeight

    contextmenuRect.x = Math.min(e.clientX, innerWidth - contextmenuRect.width)
    contextmenuRect.y = Math.min(e.clientY, innerHeight - contextmenuRect.height)

    contextmenuVisible.value = true

    if (!slideApp?.dataset?.id) return
    activeSlideApp.value =
      slidesStore.slides?.find((slide) => slide.id === slideApp.dataset.id) ?? null
  }, 60)
}

function closeContextMenu(_e: MouseEvent) {
  contextmenuVisible.value = false

  if (settingsVisible.value) return
  activeSlideApp.value = null
}

function handleConfirm(value: any) {
  console.log('handleConfirm', value)
  for (const index in slides.value) {
    if (!Object.prototype.hasOwnProperty.call(slides.value, index)) return

    if (slides.value[Number(index)].id !== activeSlideApp.value?.id) continue

    slides.value[Number(index)].size = value.size
    slides.value[Number(index)].shape = value.shape
    slides.value[Number(index)].direction = value.direction
  }
}

function handleResize(DOMRect: DOMRect) {
  contextmenuRect.width = DOMRect.width
  contextmenuRect.height = DOMRect.height
}

function handleTelePort() {
  return document.body
}

function handleSortable() {
  if (!appControllerRef.value) return

  Sortable.create(appControllerRef.value, {
    animation: 600,
    dataIdAttr: 'data-id',
    store: {
      set(sortable) {
        const toArray = sortable.toArray()
        const slideApps: SlideApp[] = []

        for (let i = 0; i < toArray.length; i++) {
          const ID = toArray[i]

          for (let j = 0; j < slides.value!.length; j++) {
            const slideApp = toRaw(slides.value![j])
            if (slideApp.id !== ID) continue
            slideApps.push({ ...slideApp, sort: i })
          }
        }
        console.log('slideApps', slideApps)
        slidesStore.updateSlideApps(slideApps)
      },
      get(sortable) {
        const toArray = slidesStore.slides?.map((slideApp) => slideApp.id)

        return toArray ?? []
      }
    }
  })
}

onMounted(function () {
  handleSortable()
  window.addEventListener('click', closeContextMenu, true)
  window.addEventListener('contextmenu', closeContextMenu, true)
})

onUnmounted(function () {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('contextmenu', closeContextMenu)
})
</script>

<template>
  <div
    @click.capture="handleController"
    @contextmenu="openContextMenu"
    ref="appControllerRef"
    class="app-controller"
  >
    <TransitionGroup name="app-controller-fade">
      <template v-for="slideApp in slidesStore.slides" :key="slideApp.id">
        <component
          :slide-app="slideApp"
          :is="appReflect[slideApp.app]()"
          :settings-visible="settingsVisible"
          :data-id="slideApp.id"
          :class="['slide-app']"
        />
      </template>
    </TransitionGroup>

    <AppSettings
      :title="null"
      :mask="false"
      placement="right"
      :closable="true"
      @update:confirm="handleConfirm"
      :slideApp="activeSlideApp"
      v-model:open="settingsVisible"
      :get-container="handleTelePort"
    />

    <Teleport to="body">
      <AppMenu
        v-resize="handleResize"
        ref="contextmenuRef"
        :x="contextmenuRect.x"
        :y="contextmenuRect.y"
        :options="menuOptions"
        v-model:visible="contextmenuVisible"
        @update:active-key="updateActiveKey"
        @contextmenu.prevent="openContextMenu"
        :class="[
          {
            'is-active': activeSlideApp && contextmenuVisible
          }
        ]"
      />
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-controller {
  @apply mx-auto grid justify-center p-5;
  @apply grid-flow-row-dense;

  outline: none;
  scrollbar-width: none;
  transition: all 500ms linear;
  row-gap: var(--app-global-row-gap, 30px);
  column-gap: var(--app-global-col-gap, 30px);
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

  :deep(:where(.slide-app)) {
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
</style>
