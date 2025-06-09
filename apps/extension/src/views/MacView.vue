<script setup lang="tsx">
import { ReDock } from '@/components/re-dock'
import { useDateFormat, useTimestamp } from '@vueuse/core'
import { MacLayout, type MacLayoutOptions } from '@/layouts/index.ts'
import { useSlidesStore } from '@/stores/slides.ts'

// import AppSettings from '@/components/app-settings/app-settings.vue'

const AppController = defineAsyncComponent(function () {
  return import('@/components/app-controller/app-controller.vue')
})

import backgroundImage from '@/assets/wallpaper/r2e391.png'
import { Modal } from 'ant-design-vue'

defineOptions({
  name: 'MacView'
})

const slidesStore = useSlidesStore()

// const { activeSlideApp, settingsVisible } = storeToRefs(slidesStore)

const keyword = ref('')

const timestamp = useTimestamp({
  interval: 'requestAnimationFrame'
})

const date = useDateFormat(timestamp, 'MM-DD', {})

const week = useDateFormat(timestamp, 'ddd', {})

const time = useDateFormat(timestamp, 'HH:mm:ss', {
  customMeridiem(hours, minutes, isLowercase, hasPeriod) {
    return hours === 12 ? '正午' : hours < 12 ? '上午' : '下午'
  }
})

const macLayout = reactive<MacLayoutOptions>({
  macLayout: {
    style: {
      backgroundImage: `url(${backgroundImage})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundOrigin: 'content-box',
      backgroundClip: 'content-box',
      backgroundPosition: 'center'
    }
  },
  macContent: {}
})

function updateKeyword(value: string) {
  keyword.value = value
}

function updateSearch() {
  window.open(`https://cn.bing.com/search?q=${keyword.value}`, '_blank')
}

onMounted(function () {})

onUnmounted(function () {
  Modal.destroyAll()
})
</script>

<template>
  <MacLayout v-bind="macLayout">
    <template #header>
      <a-space-compact class="flex">
        <a-button class="icon-apple">
          <template #icon>
            <i-local:apple-filled />
          </template>
        </a-button>
        <a-button> 镜像 </a-button>
        <a-button> 编辑 </a-button>
        <a-button> 显示 </a-button>
        <a-button> 窗口 </a-button>
        <a-button> 帮助 </a-button>
      </a-space-compact>
      <a-space-compact class="flex">
        <a-button class="icon-wifi">
          <template #icon>
            <i-local:wifi />
          </template>
        </a-button>
        <a-button class="icon-battery">
          <template #icon>
            <i-local:battery-full-outline />
          </template>
        </a-button>
        <a-popover placement="bottom" trigger="click" class="popover-input">
          <template #trigger>
            <a-button class="icon-search">
              <template #icon>
                <i-local:search />
              </template>
            </a-button>
          </template>
          <template #default>
            <a-input
              @keydown.enter="updateSearch"
              :model-value="keyword"
              @update-value="updateKeyword"
              round
              placeholder="请输入关键词!"
            />
          </template>
        </a-popover>
        <a-button class="icon-mac-toggle">
          <template #icon>
            <i-local:mac-toggle />
          </template>
        </a-button>
        <a-button class="date-time">
          <span>{{ date }}</span>
          <span>{{ week }}</span>
          <span>{{ time }}</span>
        </a-button>
      </a-space-compact>
    </template>
    <template #content>
      <AppController />
    </template>
    <template #footer>
      <ReDock />
    </template>
  </MacLayout>
</template>

<style lang="scss" scoped>
:deep(.mac-layout) {
  @apply bg-transparent;
}

:deep(.mac-header) {
  @apply flex items-center justify-between px-2 rounded-lg bg-white bg-opacity-30;
  backdrop-filter: blur(12px);
  filter: brightness(1.1);

  .icon-apple {
  }

  .icon-wifi {
  }

  .icon-battery {
  }

  .icon-search {
  }

  .date-time {
  }

  .icon-wifi,
  .icon-apple,
  .icon-battery,
  .icon-mac-toggle {
    width: initial;
    @apply px-2 py-1 block;
    margin-inline-start: 0px;

    svg {
      @apply w-5 h-5;
    }
  }
}

:deep(.mac-content) {
  @apply bg-transparent overflow-x-hidden overflow-y-scroll;

  // .app-controller {
  //   @apply w-full h-full grid grid-cols-[repeat(auto-fill,70px)] grid-rows-[repeat(auto-fill,70px)] grid-flow-dense justify-center gap-3 rounded-lg;
  // }
}

:deep(.mac-footer) {
  @apply h-20 flex items-center justify-center rounded-lg bg-white bg-opacity-30 bg-transparent;

  .dock {
    @apply h-fit;
  }
}
</style>
<style lang="scss"></style>
