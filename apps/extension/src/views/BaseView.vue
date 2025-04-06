<script setup lang="ts">
import { BaseLayout, type BaseLayoutOptions } from '@/layouts/index.ts'
// import AppController from '@/components/app-controller/app-controller.vue'
import { GET_SLIDES } from '@/apis/slides'

import slideviewbg from '@/assets/images/slide-view-bg.jpg'
import { retry } from 'alova/server'
import { Method } from 'alova'
import { httpExt } from '@/utils/alova'
import { useSlidesApps } from '@/hooks/useSlidesApps'
import { Modal } from 'ant-design-vue'
// import slideviewbg from '@/assets/images/slide-view-bg.webp'

const AppController = defineAsyncComponent(
  () => import('@/components/app-controller/app-controller.vue')
)

defineOptions({
  name: 'slide-view-1'
})

const slides = ref<SlidesApps[]>([])

const activeSlide = ref<SlidesApps>()

const componentMap = ref<Record<string, string>>({})

const baseLayout: BaseLayoutOptions = reactive({
  baseLayout: {
    hasSider: true,
    style: {
      backgroundImage: `url(${slideviewbg})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundOrigin: 'content-box',
      backgroundClip: 'content-box',
      backgroundPosition: 'center',
      backgroundColor: '#ffffff',
      transition: 'background-color 300ms'
    }
  },
  baseSider: {
    width: 50
    // collapseMode: 'width'
  },
  baseHeader: {},
  baseMain: {},
  baseContent: {},
  baseFooter: {}
})

const { updateComponentMap } = useSlidesApps()

function updateActiveSlide(slide: SlidesApps) {
  activeSlide.value = slides.value.find(item => item.id === slide.id)
}

onMounted(async () => {
  const response = await GET_SLIDES().send()

  if (response.data) {
    console.log('GET_SLIDES', response.data)
    const [slide] = (slides.value = response.data)
    activeSlide.value = slide

    updateComponentMap(slides, componentMap)
    console.log('componentMap', componentMap.value)
  }
})

onUnmounted(function () {
  Modal.destroyAll()
})
</script>

<template>
  <BaseLayout v-bind="baseLayout">
    <template #sider>
      <a-avatar class="avatar">avatar</a-avatar>
      <ul class="sider-menu">
        <li
          :data-id="slide.id"
          v-for="slide in slides"
          :key="slide.id"
          @click="updateActiveSlide(slide)"
          :class="[
            'sider-menu-item',
            'ghost',
            {
              'is-active': activeSlide?.id === slide.id
            }
          ]"
        >
          <img :src="slide.icon" alt="" class="item-icon" />
          <span class="item-text">{{ slide.name }}</span>
        </li>
      </ul>
    </template>
    <template #header>
      <a-input size="large" :bordered="false" placeholder="Borderless" />
    </template>
    <template #content>
      <TransitionGroup name="slide-controller-fade">
        <template v-for="slide in slides" :key="slide.id">
          <div v-if="activeSlide?.id === slide.id" class="slide-controller">
            <AppController :component-map="componentMap" :slideApps="slide.children" />
          </div>
        </template>
      </TransitionGroup>
    </template>
    <template #footer></template>
  </BaseLayout>
</template>

<style lang="scss" scoped>
:deep(.base-layout) {
}

:deep(.base-sider) {
  @apply bg-transparent;
  backdrop-filter: blur(4px);
  transition: transform 300ms;
  filter: brightness(1.2) invert(0);

  .avatar {
  }

  .sider-menu {
    @apply w-full h-[calc(100%-250px)] text-center text-white flex flex-col items-center justify-start gap-y-2 overflow-x-hidden overflow-y-scroll;
    scrollbar-width: none;

    .sider-menu-item {
      width: 100%;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 0px;
      row-gap: 4px;

      &:hover,
      &.is-active {
        background-color: #ffffff26;
      }

      .item-icon {
        width: 20px;
        height: 20px;
        filter: brightness(0) invert(0.8);
      }
      .item-text {
        @apply w-[80%] block text-xs leading-[1] text-nowrap line-clamp-1;
        color: rgba(255, 255, 255, 1);
      }
    }
    .add-aside-item {
      .add-icon {
        width: 20px;
        height: 20px;
        filter: brightness(0) invert(0.8);
      }
    }
  }
}

:deep(.base-main) {
  @apply h-full bg-transparent;
}

:deep(.base-header) {
  @apply h-[250px] bg-gray-300 bg-opacity-30;

  .ant-input {
    @apply w-[600px] block mt-36 mx-auto shadow-lg px-5 rounded-full bg-white bg-opacity-30 text-white text-opacity-90;
    caret-color: #ffffff;

    &::placeholder {
      @apply text-white text-opacity-60;
    }
  }
}

:deep(.base-content) {
  position: relative;
  height: calc(100vh - 300px);
  overflow: hidden scroll;
  scrollbar-width: none;
  background-color: transparent;

  .slide-controller {
    @apply w-full h-full;

    &-fade-enter-active,
    &-fade-leave-active {
      transition: all 600ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    &-fade-enter-from,
    &-fade-leave-to {
      // width: 100%;
      // overflow: hidden;
      opacity: 0;
      position: absolute;
      top: 0;
    }
    &-fade-enter-from {
      transform: translateY(calc(100% + 120px));
    }
    &-fade-leave-to {
      transform: translateY(calc(100% + 120px));
    }
  }
}

:deep(.base-footer) {
  @apply h-[50px] bg-red-300 bg-opacity-30;
}
</style>
