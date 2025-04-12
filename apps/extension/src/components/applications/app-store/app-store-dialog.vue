<script setup lang="ts">
import type { Reactive } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, A11y, Pagination, Navigation, Mousewheel } from 'swiper/modules'
import type { AutoplayOptions, PaginationOptions, SwiperModule } from 'swiper/types'

import 'swiper/scss'
import 'swiper/scss/navigation'
import 'swiper/scss/pagination'

defineOptions({
  name: 'app-store-dialog'
})

const props = withDefaults(
  defineProps<{
    appDialogRef?: AppDialog
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
            <ul class="grid grid-flow-dense grid-cols-3 grid-rows-2 gap-3">
              <li
                v-for="(item, index) in [...swiperOptions, ...swiperOptions, ...swiperOptions]"
                :key="index"
                class="h-[120px] px-5 py-3 rounded-lg hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center bg-blue-300"
              >
                {{ item.label }}
              </li>
            </ul>
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
  }
}
</style>
