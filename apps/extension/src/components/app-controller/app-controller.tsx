import { useSlidesStore } from '@/stores/slides.ts'
import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'

import type AppMenu from '../app-menu/app-menu.vue'
import type { AppReflect } from '@/types/app-controller'
import type { SlideApp, SlideAppName, SlideAppSize } from '@/types/slide-app.d.ts'
import type { ContextMenuKeys, ContextMenuMap, MenuOptions } from '@/types/app-menu'

// import SlideView from '@/assets/wallpaper/slide-view-bg.jpg'

const AppBookmark = defineAsyncComponent(function () {
  return import('@/components/applications/app-bookmark/app-bookmark.vue')
})

const AppCalendar = defineAsyncComponent(function () {
  return import('@/components/applications/app-calendar/app-calendar.vue')
})

const AppStore = defineAsyncComponent(function () {
  return import('@/components/applications/app-store/app-store.vue')
})

const AppWeb = defineAsyncComponent(function () {
  return import('@/components/applications/app-web/app-web.vue')
})

const AppExample = defineAsyncComponent(function () {
  return import('@/components/applications/app-example/app-example.vue')
})

const commonMenuOPtions: MenuOptions[] = [
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
    key: 'update-settings',
    icon: markRaw(Settings)
  }
]

const contextmenuReflect: Record<Partial<SlideAppName>, () => MenuOptions[]> = {
  'app-bookmark'() {
    return commonMenuOPtions
  },
  'app-calendar'() {
    return commonMenuOPtions
  },
  'app-store'() {
    return commonMenuOPtions
  },
  'app-web'() {
    return commonMenuOPtions
  },
  'app-example'() {
    return commonMenuOPtions
  }
}

const slidesStore = useSlidesStore()

const sizes: ReadonlyArray<SlideAppSize> = ['small', 'medium', 'large', 'huge', 'massive', 'ultra']

export function useAppController(el: Ref<InstanceType<typeof AppMenu> | null>) {
  const appReflect: AppReflect = {
    'app-bookmark'() {
      return <AppBookmark />
    },
    'app-calendar'() {
      return <AppCalendar />
    },
    'app-store'() {
      return <AppStore />
    },
    'app-web'() {
      return <AppWeb />
    },
    'app-example'() {
      return <AppExample />
    }
    // 'app-example': AppExample
  }

  const contextmenuMap: Readonly<ContextMenuMap> = {
    'update-app'() {},
    'update-size'() {
      for (const index in slidesStore.slides) {
        if (!Object.prototype.hasOwnProperty.call(slidesStore.slides, index)) return
        const slide = slidesStore.slides[index]

        if (slide.id !== activeApp.value?.id) continue
        slide.size = sizes[Math.round(Math.random() * sizes.length)]
      }
    },
    'update-wallpaper'() {},
    'update-backup'() {},
    'update-settings'() {
      drawerVisible.value = true
    }
  }

  const contextmenuRect = reactive({
    x: innerWidth - 200,
    y: 200,
    width: 0,
    height: 0
  })

  function handleResize(DOMRect: DOMRect) {
    contextmenuRect.width = DOMRect.width
    contextmenuRect.height = DOMRect.height
  }

  const activeApp = ref<SlideApp | null>(null)

  const activeMenuKey = ref<ContextMenuKeys | null>(null)

  const drawerVisible = ref(false)

  const contextmenuVisible = ref(false)

  const menuOptions = computed(() => {
    const active = slidesStore.slides.find((slide) => slide.id === activeApp.value?.id)

    console.log('active', active)

    if (!active) return []

    return contextmenuReflect[active.app]()
  })

  function updateActiveKey(value: MenuOptions) {
    activeMenuKey.value = value.key

    contextmenuMap[value.key]?.()
  }

  function openContextMenu(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as HTMLElement
    const slideApp = target.closest('.slide-app') as HTMLElement

    setTimeout(() => {
      if (!el.value?.$el) return
      contextmenuRect.width = el.value.$el.clientWidth
      contextmenuRect.height = el.value.$el.clientHeight

      contextmenuRect.x = Math.min(e.clientX, innerWidth - contextmenuRect.width)
      contextmenuRect.y = Math.min(e.clientY, innerHeight - contextmenuRect.height)

      contextmenuVisible.value = true
      if (!slideApp?.dataset?.id) return
      activeApp.value = slidesStore.slides.find((slide) => slide.id === slideApp.dataset.id) ?? null
    }, 60)
  }

  function closeContextMenu(_e: MouseEvent) {
    contextmenuVisible.value = false
  }

  return {
    activeApp,
    appReflect,
    handleResize,
    drawerVisible,

    menuOptions,
    activeMenuKey,
    contextmenuMap,
    updateActiveKey,
    openContextMenu,
    contextmenuRect,
    closeContextMenu,
    contextmenuVisible
  }
}
