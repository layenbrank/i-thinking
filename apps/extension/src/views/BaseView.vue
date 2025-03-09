<script setup lang="tsx">
import { RouterLink } from 'vue-router'
import { NIcon, useMessage, type MenuOption } from 'naive-ui'

import {
  useTimestamp,
  useDateFormat,
  onClickOutside,
  useFetch,
  useDevicePixelRatio,
  useMagicKeys,
  whenever
} from '@vueuse/core'

import { BaseLayout, type BaseLayoutOptions } from '@/layouts/index.ts'
import { BookOutline as BookIcon, HomeOutline as HomeIcon } from '@vicons/ionicons5'
import { calendarService as calendar, ReSegment } from '@desktop-widgets/core'
import { ComboboxTrigger, type ComboboxTriggerProps } from '@/components/combobox-trigger/index.ts'
import { ReDock } from '@/components/re-dock'

const Bookmarks = defineAsyncComponent(() => import('@/components/bookmarks/index.vue'))
const Notepad = defineAsyncComponent(() => import('@/components/notepad/index.vue'))
const AppStore = defineAsyncComponent(() => import('@/components/app-store/index.vue'))

import slideViewBG from '@/assets/slide-view-bg.jpg'
import type { Component } from 'vue'

export interface SearchResult {
  s: Empty[]
  i: I
}

export interface I {
  ig: string
}

export interface Empty {
  id: string
  q: string
  u: string
  t: string
}

defineOptions({
  name: 'HomeView'
})

const comboboxRef = useTemplateRef('comboboxRef')
const suggestionsRef = useTemplateRef('suggestionsRef')

const time = useTimestamp({
  interval: 'requestAnimationFrame'
})

const dateTime = useDateFormat(time, 'YYYY-MM-DD HH:mm:ss', {
  customMeridiem(hours, minutes, isLowercase, hasPeriod) {
    return hours < 12 ? '上午' : '下午'
  }
})

const message = useMessage()

const { pixelRatio } = useDevicePixelRatio()

const { Ctrl, Enter, ArrowUp, ArrowDown, Space } = useMagicKeys({
  target: comboboxRef.value?.$el,
  passive: false,
  onEventFired(e) {
    const keyMap: string[] = ['Enter', 'ArrowUp', 'ArrowDown']

    for (const key of keyMap) {
      e.key === key && e.preventDefault()
    }
  }
})

const activeKey = ref<string | null>(null)

const collapsed = ref(true)

const keyword = ref('')

const searchResult = ref<Empty[]>([])

const activeIndex = ref(0)

const visible = ref(false)

const refetch = shallowRef(false)

const appModules: Component[] = [Bookmarks, Notepad, AppStore]

// const urlParams = new URLSearchParams({
//   q: '',
//   cp: '0',
//   client: 'gws-wiz-serp',
//   xssi: 't',
//   gs_pcrt: '2',
//   hl: 'zh-CN',
//   authuser: '0',
//   pq: searchKeyword.value,
//   psi: 'LCbMZ5H5Jczk1e8PiebW4AI.1741432365805',
//   dpr: pixelRatio.value.toString(),
//   nolsbt: '1'
// })

// https://www.google.com/complete/search?q&cp=0&client=gws-wiz-serp&xssi=t&gs_pcrt=2&hl=zh-CN&authuser=0&pq=测试是什么岗位&psi=LCbMZ5H5Jczk1e8PiebW4AI.1741432365805&dpr=1.5&nolsbt=1

// const url= `https://www.google.com/complete/search?${useParams.toString()}`

const urlParams = new URLSearchParams({
  pt: 'page.home',
  mkt: 'zh-cn',
  qry: keyword.value,
  cp: keyword.value.length.toString(),
  csr: '1',
  msbqf: 'false',
  pths: '1',
  // cvid: '01CAFCD9BF3B4B8E96E8F3DA2C934C60'
  // cvid: 'B45441F70E424662B08ACD301492ECBD'
  cvid: '71FCB2EE7E4A44EE95583AFF28443800'
})
// function generateCvid(): string {
//   // 生成标准GUID
//   const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//     const r = Math.random() * 16 | 0;
//     const v = c === 'x' ? r : (r & 0x3 | 0x8);
//     return v.toString(16);
//   });

//   // 转换为必应使用的格式（移除连字符并转为大写）
//   return guid.replace(/-/g, '').toUpperCase();
// }

// https://cn.bing.com/AS/Suggestions?pt=page.serp&bq=测速网&mkt=zh-cn&ds=mobileweb&qry=测速网&csr=1&pths=1&zis=1&pf=1&cvid=81E78D84077D4205893A0616F9365962

// const url = `/bing/AS/Suggestions?${urlParams.toString()}`

const url = shallowRef(`/bing/AS/Suggestions?${urlParams.toString()}`)

const { data, abort, execute, canAbort } = useFetch<string>(url, {
  refetch,
  immediate: false
}).get()

const baseLayout: Ref<BaseLayoutOptions> = computed(() => ({
  baseLayout: {
    hasSider: true,
    style: {
      backgroundImage: `url(${slideViewBG})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundOrigin: 'content-box',
      backgroundClip: 'content-box',
      backgroundPosition: 'center'
    }
  },
  baseSider: {
    position: 'absolute',
    width: 240,
    collapseMode: 'width',
    collapsedWidth: 64,
    collapsed: collapsed.value,
    showTrigger: true,
    onCollapse() {
      collapsed.value = true
    },
    onExpand() {
      collapsed.value = false
    },
    class: [
      {
        'base-sider-collapsed': collapsed.value
      }
    ]
  },
  baseHeader: {},
  baseMain: {
    position: 'absolute',
    style: {
      marginLeft: collapsed.value ? '64px' : '240px'
    },
    class: [
      {
        'base-main-collapsed': collapsed.value
      }
    ]
  },
  baseContent: {
    contentStyle: 'padding: 24px;'
  },
  baseFooter: {}
}))

const comboboxTrigger: Ref<ComboboxTriggerProps> = computed(() => {
  return {
    inputProps: {
      round: !visible.value,
      size: 'large',
      value: keyword.value,
      async onUpdateValue(value) {
        keyword.value = value

        // 如果输入为空，清空结果并返回
        if (!value.trim()) return
        if (!visible.value) return

        urlParams.set('qry', keyword.value)
        // 更新URL引用，确保useFetch使用新的URL
        url.value = `/bing/AS/Suggestions?${urlParams.toString()}`
        // 输出 URLSearchParams 字符
        console.log(urlParams.toString())

        if (canAbort.value) abort()

        // 使用新URL执行请求
        await execute(true)

        try {
          console.log('data', data.value)
          if (data.value) {
            const res = JSON.parse(data.value) as SearchResult
            searchResult.value = res.s || []
          }
        } catch (error) {
          console.error('解析搜索结果失败:', error)
          searchResult.value = []
        }
      },
      onFocus() {
        visible.value = true
      }
    }
  }
})

const menuOptions: MenuOption[] = [
  {
    label() {
      return <RouterLink to={{ name: 'base-view' }}>BaseLayout</RouterLink>
    },
    key: 'base-view',
    icon: renderIcon(HomeIcon)
  },
  {
    key: 'divider-1',
    type: 'divider',
    props: {
      style: {
        width: '60%',
        marginLeft: '50%',
        transform: 'translateX(-50%)'
      }
    }
  },
  {
    label() {
      return <RouterLink to={{ name: 'mac-view' }}>MacLayout</RouterLink>
    },
    key: 'about',
    icon: renderIcon(BookIcon)
  }
]

whenever(Ctrl, value => {
  message.info(`Ctrl: ${value}`)
})

whenever(Space, value => {
  message.info(`Space: ${value}`)
})

whenever(ArrowUp, value => {
  if (!visible.value) return
  if (activeIndex.value > 0) {
    activeIndex.value -= 1
    // 滚动 suggestionsRef n-card__content 以便显示建议
    const suggestions = suggestionsRef.value?.$el as HTMLElement
    suggestions.querySelector('.n-card__content')?.scrollTo({
      top: activeIndex.value * 48,
      behavior: 'smooth'
    })
  } else {
    activeIndex.value = searchResult.value.length - 1
    const suggestions = suggestionsRef.value?.$el as HTMLElement
    suggestions.querySelector('.n-card__content')?.scrollTo({
      top: (searchResult.value.length - 1) * 48,
      behavior: 'smooth'
    })
  }
})

whenever(ArrowDown, value => {
  if (!visible.value) return
  if (activeIndex.value < searchResult.value.length - 1) {
    activeIndex.value += 1
    const suggestions = suggestionsRef.value?.$el as HTMLElement
    suggestions.querySelector('.n-card__content')?.scrollTo({
      top: activeIndex.value * 48,
      behavior: 'smooth'
    })
  } else {
    activeIndex.value = 0
    const suggestions = suggestionsRef.value?.$el as HTMLElement
    suggestions.querySelector('.n-card__content')?.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
})

whenever(Enter, async value => {
  message.info(`Enter: ${value}`)
  if (!visible.value) return
  if (!searchResult.value.length) return
  window.open(`https://cn.bing.com/search?q=${searchResult.value[activeIndex.value].u}`)
})

onClickOutside(comboboxRef, function () {
  if (visible.value) {
    visible.value = false
    message.info('[onBlur]')
  }
})

const AppController = defineComponent({
  setup() {},
  render() {
    return (
      <div class="widget-container w-full h-full grid grid-cols-[repeat(auto-fill,70px)] grid-rows-[repeat(auto-fill,70px)] grid-flow-dense justify-center gap-3 rounded-lg">
        {appModules.map(appModule => {
          return h(appModule, { key: appModule.name })
        })}
      </div>
    )
  }
})

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

function handleUpdateValue(key: string, item: MenuOption) {
  message.info(`[onUpdate:value]: ${JSON.stringify(key)}`)
  message.info(`[onUpdate:value]: ${JSON.stringify(item)}`)
}
</script>

<template>
  <BaseLayout v-bind="baseLayout">
    <template #sider>
      <n-menu
        v-model:value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        @update:value="handleUpdateValue"
        :class="['sider-menu w-full', { 'sider-menu-collapsed': collapsed }]"
      />
    </template>
    <template #header>
      <div class="date-time-module">
        <span class="header-time">{{ dateTime }}</span>
        <span class="header-date">{{ calendar.getLunarDate(dateTime, 'lMlD') }}</span>
      </div>
      <ComboboxTrigger
        ref="comboboxRef"
        v-bind="comboboxTrigger"
        :combobox-class="[
          {
            'combobox-trigger-visible': visible,
            'combobox-trigger-collapsed': visible && !searchResult.length
          }
        ]"
      >
        <template #content>
          <n-card
            ref="suggestionsRef"
            v-if="visible && searchResult.length"
            :class="[
              'combobox-card',
              {
                'combobox-card-visible': visible
              }
            ]"
          >
            <div
              v-for="(item, index) in searchResult"
              :key="item.id"
              :data-id="index"
              class="w-full cursor-pointer hover:bg-blue-300 block py-2 px-2 rounded-md transition-all"
              :class="[
                {
                  'bg-blue-300': index === activeIndex
                }
              ]"
            >
              {{ item.q }}
            </div>
          </n-card>
        </template>
      </ComboboxTrigger>
    </template>
    <template #content>
      <AppController></AppController>
    </template>
    <template #footer>
      <ReDock />
    </template>
  </BaseLayout>
</template>

<style lang="scss" scoped>
:deep(.base-layout) {
}
:deep(.base-sider) {
  @apply h-full top-1/2 -translate-y-1/2 rounded-none transition-all duration-300 bg-transparent text-white;
  backdrop-filter: blur(12px);
  filter: brightness(1.1);

  .sider-menu.n-menu {
    .n-menu-item-content {
      &:hover {
        .n-menu-item-content-header a,
        .n-menu-item-content__icon {
          @apply text-black;
        }
      }
      .n-menu-item-content-header a,
      .n-menu-item-content__icon {
        @apply text-white;
      }
    }
  }
}

:deep(.base-sider-collapsed) {
  @apply h-1/2 top-1/2 -translate-y-1/2 rounded-[32px];

  .n-layout-sider-scroll-container {
    @apply py-4;
  }

  .n-menu .n-menu-item-content:not(.n-menu-item-content-disabled):hover::before {
    background-color: var(--n-item-color-hover);
  }

  .n-menu .n-menu-item-content:not(.n-menu-item-content-disabled)::before {
    border-radius: 6px;
  }
}

:deep(.base-main) {
  @apply transition-all duration-300 bg-transparent;

  .n-layout-scroll-container {
    @apply p-0 bg-transparent;
    // scrollbar-width: none;
  }

  .base-main-collapsed {
    // @apply ml-[64px];
  }
}

$header-h: 250px;

:deep(.base-header) {
  @apply flex flex-col items-center justify-evenly gap-y-2 z-10 bg-transparent;
  border: 1px solid gray;
  height: $header-h;

  .date-time-module {
    @apply flex flex-col items-center justify-center gap-y-1;

    .header-time {
      @apply text-2xl font-bold text-nowrap;
      @apply text-white;
    }

    .header-date {
      @apply text-lg font-semibold text-nowrap;
      @apply text-white;
    }
  }

  .combobox-trigger {
    @apply z-[1];
    width: clamp(300px, 80%, 500px);

    .n-input-wrapper {
      @apply px-4;
    }

    &-visible {
      .n-input {
        --n-box-shadow-focus: 0 0 0 0px transparent !important;
        --n-border-focus: 0px solid transparent !important;
        @apply rounded-t-xl rounded-b-none;
      }
    }
    &-collapsed {
      .n-input {
        --n-box-shadow-focus: 0 0 0 2px rgba(24, 160, 88, 0.2) !important;
        --n-border-focus: 1px solid #36ad6a !important;
        @apply rounded-3xl;
      }
    }
  }
}

:deep(.base-content) {
  @apply bg-transparent;
  height: calc(100% - #{$header-h + 64px});

  .n-layout-scroll-container .n-h.n-h2 {
    @apply text-white rounded-lg;
    --n-margin: 0px !important;
    padding: 16px 12px;

    &:hover {
      @apply bg-white bg-opacity-30;
    }
  }
}

:deep(.base-footer) {
  @apply rounded-lg bg-transparent text-white text-center;
  backdrop-filter: blur(12px);
  filter: brightness(1.1);
}

.combobox-card {
  @apply h-fit max-h-96 rounded-b-xl rounded-t-none;

  :deep(.n-card__content) {
    @apply overflow-x-hidden overflow-y-scroll;
  }

  &-visible {
  }
}
</style>
