import type { SlideApp } from '@/types/slide-app'
import type { JSX } from 'vue/jsx-runtime'
import SlideView from '@/assets/wallpaper/slide-view-bg.jpg'

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

export const appModules = ref<SlideApp[]>([
  {
    id: randomID(),
    slideID: randomID(),
    app: 'app-bookmark',
    width: '60px',
    height: '60px',
    size: 'small',
    // direction: 'horizontal',
    direction: 'vertical',
    // shape: 'rectangle',
    shape: 'square',
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

    // size: 'mini',
    size: 'small',
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
    size: 'small',
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
    size: 'small',
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

    // size: 'mini',
    // size: 'small',
    // size: 'medium',
    // size: 'large',
    // size: 'huge',
    // size: 'massive',
    size: 'ultra',

    // direction: 'horizontal',
    direction: 'vertical',

    // shape: 'square',
    shape: 'rectangle',
    // shape: 'circle',
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

export const appReflect: Record<string, () => JSX.Element> = {
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
