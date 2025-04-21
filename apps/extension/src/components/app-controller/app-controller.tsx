import type { SlideApp, SlideAppName } from '@/types/slide-app'
import type { JSX } from 'vue/jsx-runtime'
import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'

// import SlideView from '@/assets/wallpaper/slide-view-bg.jpg'

import type { SlideAppSize } from '@/types/slide-app.d.ts'

export type ContextMenuMap = Readonly<Partial<Record<ContextMenuKeys, () => void>>>

type AppReflect = Readonly<Record<string, () => JSX.Element>>

export type ContextMenuKeys =
  | 'update-app'
  | 'update-wallpaper'
  | 'update-backup'
  | 'update-layouts'
  | 'update-size'
  | 'single-delete'
  | 'batch-deletion'
  | 'update-settings'
  | 'single-edit'
  | 'new-tab'
  | 'release'

export interface MenuOptions {
  label: string
  key: ContextMenuKeys
  icon: Component | string
}

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

function randomID() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

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

export const modules = ref<SlideApp[]>([
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-bookmark',
    width: '60px',
    height: '60px',
    size: 'mini',
    // direction: 'horizontal',
    direction: 'vertical',
    // shape: 'rectangle',
    // shape: 'square',
    shape: 'circle',
    round: '12px',
    icon: 'https://cdn.jsdelivr.net/gh/vuejs/vuejs.org@master/public/images/favicon.ico',
    name: '书签',
    backgroundColor: '#ffffff4d',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-calendar',
    width: '60px',
    height: '60px',
    size: 'medium',
    direction: 'horizontal',
    // shape: 'square',
    shape: 'rectangle',
    round: '12px',
    name: '日历',
    icon: '',
    backgroundColor: '#fff',
    backgroundImage: null,
    // backgroundImage: SlideView,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-store',
    width: '60px',
    height: '60px',
    // round: null,
    round: '30px',

    size: 'mini',
    // size: 'small',
    // size: 'medium',
    // size: 'large',

    // direction: 'horizontal',
    direction: 'vertical',

    // shape: 'circle',
    shape: 'square',
    // shape: 'rectangle',

    name: '应用商店',
    icon: '',
    backgroundColor: '#ffffff4d',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-web',
    url: 'https://www.baidu.com',
    size: 'mini',
    round: '12px',
    width: '60px',
    height: '60px',
    direction: 'horizontal',
    shape: 'square',
    name: '百度',
    icon: 'https://www.baidu.com/favicon.ico',
    backgroundColor: '#ffffff4d',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-web',
    width: '60px',
    height: '60px',
    url: 'https://weixin.qq.com',
    size: 'mini',
    round: '12px',
    direction: 'horizontal',
    shape: 'square',
    name: '微信',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
    backgroundColor: '#ffffff4d',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-example',
    width: '60px',
    height: '60px',
    url: 'https://weixin.qq.com',
    round: '12px',

    size: 'mini',
    // size: 'small',
    // size: 'medium',
    // size: 'large',
    // size: 'huge',
    // size: 'massive',
    // size: 'ultra',

    // direction: 'horizontal',
    direction: 'vertical',

    // shape: 'square',
    // shape: 'rectangle',
    shape: 'circle',
    name: '微信1',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
    backgroundColor: '#ffffff4d',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  }
])

export function useAppController(el: Ref<HTMLElement | null>) {
  const sizes: SlideAppSize[] = ['small', 'medium', 'large', 'huge', 'massive', 'ultra']

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
      for (const index in modules.value) {
        if (!Object.prototype.hasOwnProperty.call(modules.value, index)) return
        const module = modules.value[index]

        if (module.id !== activeApp.value) continue
        module.size = sizes[Math.round(Math.random() * sizes.length)]
      }
    },
    'update-wallpaper'() {},
    'update-backup'() {},
    'update-settings'() {}
  }

  const activeApp = ref<string>()

  const activeMenuKey = ref<ContextMenuKeys | null>(null)

  const contextmenuVisible = ref(false)

  const contextmenuRect = reactive({
    x: innerWidth - 200,
    y: 200,
    width: 0,
    height: 0
  })

  // const menuOptions = reactive<Array<MenuOptions>>([
  //   {
  //     label: '添加应用',
  //     key: 'update-app',
  //     icon: markRaw(Add)
  //   },
  //   {
  //     label: '更新大小',
  //     key: 'update-size',
  //     icon: markRaw(Add)
  //   },
  //   {
  //     label: '更新布局',
  //     key: 'update-layouts',
  //     icon: markRaw(Add)
  //   },
  //   {
  //     label: '更换壁纸',
  //     key: 'update-wallpaper',
  //     icon: markRaw(Download)
  //   },
  //   {
  //     label: '备份云端',
  //     key: 'update-backup',
  //     icon: markRaw(Cloud)
  //   },
  //   {
  //     label: '设置',
  //     key: 'update-settings',
  //     icon: markRaw(Settings)
  //   }
  // ])
  const menuOptions = computed(() => {
    const active = modules.value.find((module) => module.id === activeApp.value)
    console.log('active', active)

    if (!active) return []

    return contextmenuReflect[active.app]()
  })

  function updateActiveKey(value: MenuOptions) {
    activeMenuKey.value = value.key

    return contextmenuMap[value.key]?.()
  }

  function handleResize(DOMRect: DOMRect) {
    contextmenuRect.width = DOMRect.width
    contextmenuRect.height = DOMRect.height
  }

  function openContextMenu(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as HTMLElement
    const appItem = target.closest('.app-item') as HTMLElement

    setTimeout(() => {
      if (!el.value) return
      contextmenuRect.width = el.value.clientWidth
      contextmenuRect.height = el.value!.clientHeight

      contextmenuRect.x = Math.min(e.clientX, innerWidth - contextmenuRect.width)
      contextmenuRect.y = Math.min(e.clientY, innerHeight - contextmenuRect.height)

      contextmenuVisible.value = true
      activeApp.value = appItem?.dataset.id
    }, 60)
  }

  function closeContextMenu(_e: MouseEvent) {
    contextmenuVisible.value = false
  }

  return {
    sizes,
    activeApp,
    appReflect,
    menuOptions,
    handleResize,
    activeMenuKey,
    contextmenuMap,
    updateActiveKey,
    openContextMenu,
    contextmenuRect,
    closeContextMenu,
    contextmenuVisible
  }
}
