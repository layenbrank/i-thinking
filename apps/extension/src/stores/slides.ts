import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'
import { from, tap, switchMap } from 'rxjs'
import { slideModule } from '@/database/slide-app/slide-app.module.ts'

import type { SlideApp, SlideAppName } from '@/types/slide-app'
import { isEmpty } from 'lodash-es'

const DEFAULT: ReadonlyArray<SlideApp> = [
  {
    id: randomID(),
    slideID: randomID(),
    sort: 1,
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
    sort: 2,
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
    sort: 3,
    app: 'app-store',
    width: '60px',
    height: '60px',
    // round: null,
    round: '15px',

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
    sort: 3,
    app: 'app-web',
    url: 'https://www.baidu.com',
    size: 'mini',
    round: '8px',
    width: '60px',
    height: '60px',
    direction: 'horizontal',
    shape: 'square',
    name: '百度',
    icon: 'https://www.baidu.com/favicon.ico',
    backgroundColor: '#ffffff',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    sort: 5,
    app: 'app-web',
    width: '60px',
    height: '60px',
    url: 'https://weixin.qq.com',
    size: 'mini',
    round: '20px',
    direction: 'horizontal',
    shape: 'square',
    name: '微信',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
    backgroundColor: '#ffffff',
    backgroundImage: null,
    textSize: '13px',
    textColor: '#ffffff',
    description: '测试',
    downloadCount: 1000
  },
  {
    id: randomID(),
    slideID: randomID(),
    sort: 6,
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
]

function randomID() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
export const useSlidesStore = defineStore('counter', function () {
  const activeSlideApp = ref<SlideApp | null>(null)

  const settingsVisible = ref(false)

  const slides = useObservable(
    from(
      liveQuery(function () {
        return slideModule.offset(1).limit(30).sortBy('sort')
      })
    ).pipe(
      tap(function (response) {
        if (isEmpty(response)) slideModule.bulkAdd(DEFAULT)
      })
    )
  )

  async function updateSlideApp(slideAppID: string, updates: Partial<SlideApp>) {
    const slideApp = await slideModule.get(slideAppID)
    if (slideApp) return slideModule.update(slideAppID, { ...slideApp, ...updates })
    else return slideModule.add({ ...updates, id: slideAppID } as SlideApp)
  }

  function updateSlideApps(slideApps: SlideApp[]) {
    return slideModule.bulkPut(slideApps)
  }

  return {
    slides,
    updateSlideApp,
    updateSlideApps,

    activeSlideApp,
    settingsVisible
  }
})
