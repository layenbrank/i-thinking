<script setup lang="ts">
import type { Reactive } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, A11y, Pagination, Navigation, Mousewheel } from 'swiper/modules'
import type { AutoplayOptions, PaginationOptions, SwiperModule } from 'swiper/types'

import 'swiper/scss'
import 'swiper/scss/navigation'
import 'swiper/scss/pagination'

defineOptions({
  name: 'AppStoreWindow'
})

interface AppStoreWindowOptions {
  label: string
  key: string
}

const modules: SwiperModule[] = [A11y, Autoplay, Mousewheel, Navigation, Pagination]

const activeKey = ref<AppStoreWindowOptions>({
  label: 'All',
  key: 'all'
})

const options: AppStoreWindowOptions[] = [
  {
    label: 'All',
    key: 'all'
  },
  {
    label: 'Free',
    key: 'free'
  },
  {
    label: 'Paid',
    key: 'paid'
  },
  {
    label: 'New',
    key: 'new'
  },
  {
    label: 'Trending',
    key: 'trending'
  },
  {
    label: 'TopRated',
    key: 'toprated'
  }
]

const swiperOptions = ref([
  {
    label: 'All',
    key: 'all',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel1.jpeg'
  },
  {
    label: 'Free',
    key: 'free',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel2.jpeg'
  },
  {
    label: 'Paid',
    key: 'paid',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel3.jpeg'
  },
  {
    label: 'New',
    key: 'new',
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

function updateActiveKey(item: AppStoreWindowOptions) {
  activeKey.value = item
}
</script>

<template>
  <div class="appStore-window">
    <ul class="appStore-categories">
      <li
        @click="updateActiveKey(item)"
        v-for="item in options"
        :key="item.key"
        class="appStore-category"
      >
        {{ item.label }}
      </li>
    </ul>
    <ul class="appStore-content">
      <template v-for="item in options">
        <li v-if="activeKey.key === item.key" :key="item.key">
          <Swiper
            :slides-per-view="1"
            :space-between="30"
            :modules="modules"
            :mousewheel="true"
            :allow-touch-move="false"
            :autoplay="autoplay"
            direction="horizontal"
            :navigation="false"
            :centeredSlides="true"
            :loop="hasMultipleSlides"
            :pagination="pagination"
            class="appStore-swiper w-full h-60"
          >
            <swiper-slide v-for="item in swiperOptions" :key="item.key" class="w-full h-full">
              <img :src="item.image" alt="" class="carousel-img" />
            </swiper-slide>
          </Swiper>
        </li>
      </template>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.appStore-window {
  @apply h-full flex;

  .appStore-categories {
    @apply w-20 h-full flex flex-col items-center gap-y-1 rounded-l-lg overflow-x-hidden overflow-y-scroll bg-red-300;
    scrollbar-width: none;

    .appStore-category {
      @apply w-full px-2 py-2 text-center rounded-md bg-gray-300 cursor-pointer transition-all duration-300;

      &:hover {
        @apply bg-white bg-opacity-30;
      }
    }
  }

  .appStore-content {
    @apply flex-1 rounded-r-lg overflow-x-hidden overflow-y-scroll bg-blue-300;
    // --swiper-navigation-size: 30px;

    .appStore-swiper {
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

    .carousel-img {
      @apply w-full h-full object-cover;
    }
  }

  // .n-tabs-nav {
  //   .n-tabs-nav-scroll-wrapper {
  //   }
  // }

  // .n-tab-pane {
  //   @apply h-full bg-red-300;
  // }
}
</style>
