<script setup lang="ts">
import { Modal } from 'ant-design-vue'

import { GET_SLIDE_APP } from '@/apis/slides-apps'
import { BaseLayout, type BaseLayoutOptions } from '@/layouts/index.ts'

import backgroundImage from '@/assets/wallpaper/r2e391.png'

const AppController = defineAsyncComponent(
  () => import('@/components/app-controller/app-controller.vue')
)

defineOptions({
  name: 'slide-view-1'
})

const baseLayout: BaseLayoutOptions = reactive({
  baseLayout: {
    hasSider: true,
    style: {
      backgroundImage: `url(${backgroundImage})`,
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
<<<<<<< HEAD
}))

const comboboxTrigger: Ref<ComboboxTriggerProps> = computed(() => {
  return {
    inputProps: {
      round: !visible.value,
      size: 'large',
      value: keyword.value,
      async onUpdateValue(value: string) {
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

whenever(Ctrl, (value) => {
  message.info(`Ctrl: ${value}`)
})

whenever(Space, (value) => {
  message.info(`Space: ${value}`)
})

whenever(ArrowUp, (value) => {
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

whenever(ArrowDown, (value) => {
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

whenever(Enter, async (value) => {
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
        {appModules.map((appModule) => {
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
=======
})

onMounted(async () => {
  GET_SLIDE_APP().subscribe(function (response) {
    console.log('response', response)
  })
})

onUnmounted(function () {
  Modal.destroyAll()
})
>>>>>>> 148e2962941f416862e229e820aa19599f127d5f
</script>

<template>
  <BaseLayout v-bind="baseLayout">
    <template #sider>
      <a-avatar class="avatar">avatar</a-avatar>
      <ul class="sider-menu"></ul>
    </template>
    <template #header>
      <a-input size="large" :bordered="false" placeholder="Borderless" />
    </template>
    <template #content>
      <!-- <TransitionGroup name="slide-controller-fade">
        <template v-for="slide in slides" :key="slide.id">
          <div v-if="activeSlide?.id === slide.id" class="slide-controller">
            <AppController :component-map="componentMap" :slideApps="slide.children" />
          </div>
        </template>
      </TransitionGroup> -->
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
      .update-app {
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
