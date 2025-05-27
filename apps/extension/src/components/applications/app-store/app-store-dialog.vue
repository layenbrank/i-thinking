<script setup lang="tsx">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, A11y, Pagination, Navigation, Mousewheel } from 'swiper/modules'

import 'swiper/scss'
import 'swiper/scss/navigation'
import 'swiper/scss/pagination'

import type { Reactive } from 'vue'
import type { SlideApp, SlideAppDialog } from '@/types/slide-app'
import type { AutoplayOptions, PaginationOptions, SwiperModule } from 'swiper/types'
import type { AppReflect } from '@/types/app-controller'

const AppBookmark = defineAsyncComponent(function () {
  return import('@/components/applications/app-bookmark/app-bookmark.vue')
})

const AppCalendar = defineAsyncComponent(function () {
  return import('@/components/applications/app-calendar/app-calendar.vue')
})

const AppWeb = defineAsyncComponent(function () {
  return import('@/components/applications/app-web/app-web.vue')
})

const AppExample = defineAsyncComponent(function () {
  return import('@/components/applications/app-example/app-example.vue')
})

defineOptions({
  name: 'app-store-dialog'
})

const props = withDefaults(
  defineProps<{
    appDialogRef?: SlideAppDialog
  }>(),
  {}
)

interface AppStoreOptions {
  label: string
  key: string
}

const modules: SwiperModule[] = [A11y, Autoplay, Mousewheel, Navigation, Pagination]

const activeKey = ref<AppStoreOptions>({
  label: '主页',
  key: 'home'
})

const options: AppStoreOptions[] = [
  {
    label: '主页',
    key: 'home'
  },
  {
    label: '应用',
    key: 'application'
  },
  {
    label: '游戏',
    key: 'game'
  },
  {
    label: 'AI Hub',
    key: 'ai'
  }
]

const appReflect: AppReflect = {
  'app-bookmark'() {
    return <AppBookmark />
  },
  'app-calendar'() {
    return <AppCalendar />
  },
  'app-example'() {
    return <AppExample />
  },
  'app-web'() {
    return <AppWeb />
  }
}

const applications: ReadonlyArray<SlideApp> = [
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

const swiperOptions = ref([
  {
    label: '主页',
    key: 'home',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel1.jpeg'
  },
  {
    label: '应用',
    key: 'application',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel2.jpeg'
  },
  {
    label: '游戏',
    key: 'game',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel3.jpeg'
  },
  {
    label: 'AI Hub',
    key: 'ai',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel4.jpeg'
  }
])

const hasMultipleSlides = computed(() => swiperOptions.value.length > 1)

const autoplay: Reactive<AutoplayOptions> = reactive({
  delay: 3000,
  pauseOnMouseEnter: true,
  disableOnInteraction: false
})

const pagination: Reactive<PaginationOptions> = reactive({
  enabled: true,
  clickable: true
})

function updateActiveKey(item: AppStoreOptions) {
  activeKey.value = item
}

function randomID() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
</script>

<template>
  <div class="app-store-dialog">
    <ul class="app-store-categories">
      <li
        @click="updateActiveKey(item)"
        v-for="item in options"
        :key="item.key"
        :class="[
          'app-store-category',
          {
            'is-active': activeKey.key === item.key
          }
        ]"
      >
        {{ item.label }}
      </li>
    </ul>
    <ul class="app-store-content">
      <template v-for="item in options">
        <li v-if="activeKey.key === item.key" :key="item.key" class="content-item">
          <!-- :autoplay="autoplay" -->
          <Swiper
            :slides-per-view="1.15"
            :space-between="20"
            :modules="modules"
            :mousewheel="true"
            :allow-touch-move="false"
            direction="horizontal"
            :navigation="false"
            :loop="hasMultipleSlides"
            :pagination="pagination"
            class="app-store-swiper w-full h-60"
          >
            <swiper-slide
              :style="{
                backgroundImage: `url(${item.image})`
              }"
              v-for="item in swiperOptions"
              :key="item.key"
            >
              <div class="image-container">
                <img :src="item.image" alt="" class="carousel-img" />
              </div>
            </swiper-slide>
          </Swiper>
          <div>
            <h3>热门应用</h3>
            <!-- <ul class="grid grid-flow-dense grid-cols-3 grid-rows-2 gap-3">
              <li
                v-for="(item, index) in [...swiperOptions, ...swiperOptions, ...swiperOptions]"
                :key="index"
                class="h-[120px] px-5 py-3 rounded-lg hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center bg-blue-300"
              >
                {{ item.label }}
              </li>
            </ul> -->
            <TransitionGroup tag="div" name="app-controller-fade" class="app-controller">
              <template v-for="slideApp in applications" :key="slideApp.id">
                <component
                  :slide-app="slideApp"
                  :is="appReflect[slideApp.app]?.()"
                  :settings-visible="false"
                  :data-id="slideApp.id"
                  :class="['slide-app']"
                />
              </template>
            </TransitionGroup>
          </div>
        </li>
      </template>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.app-store-dialog {
  @apply h-full flex justify-between gap-x-2;

  .app-store-categories {
    @apply w-20 h-full flex flex-col items-center gap-y-1 rounded-l-lg overflow-x-hidden overflow-y-scroll  bg-[#fbeff5] p-2;
    scrollbar-width: none;

    .app-store-category {
      @apply w-full px-2 py-2 text-center rounded-md cursor-pointer transition-all duration-300;

      &:hover,
      &.is-active {
        @apply bg-white;
      }
    }
  }

  .app-store-content {
    @apply flex-1 rounded-r-lg overflow-x-hidden overflow-y-scroll pt-2 pr-2 pb-2;
    scrollbar-width: none;
    // --swiper-navigation-size: 30px;

    .content-item {
      @apply w-full h-full overflow-x-hidden overflow-y-scroll;
    }

    .app-store-swiper {
      @apply w-full h-[60%];
      @apply overflow-hidden rounded-lg;
      --swiper-navigation-size: 30px;

      :deep(.swiper-wrapper) {
        @apply w-full h-full;
      }

      :deep(.swiper-slide) {
        @apply w-full h-full rounded-lg overflow-hidden;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        background-attachment: fixed;

        &.swiper-slide-active {
        }
        &.swiper-slide-next {
        }
      }

      .image-container {
        @apply w-full h-full flex items-center justify-center rounded-lg overflow-hidden;
        backdrop-filter: blur(60px);
        background-color: rgba(0, 0, 0, 0.52);
      }
      .carousel-img {
        @apply h-full object-contain rounded-lg;
      }
      :deep(.swiper-pagination) {
        $bullet-height: 6px;

        .swiper-pagination-bullet {
          @apply bg-[#ccc] rounded-full opacity-50 transition-all duration-300;
          height: $bullet-height;

          &.swiper-pagination-bullet-active {
            @apply w-[34px] opacity-100;
            background: var(--color-ref-primary60, #4c8df6ff);
            border-radius: ($bullet-height * 1.67);
          }

          &:not(.swiper-pagination-bullet-active) {
            width: $bullet-height;
          }
        }
      }
    }

    .app-controller {
      @apply mx-auto grid justify-center p-5;
      @apply grid-flow-row-dense;

      :deep(:where(.slide-app)) {
        @apply relative cursor-pointer text-center;

        &
          > :where(
            div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])
          ) {
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
  }
}
</style>
