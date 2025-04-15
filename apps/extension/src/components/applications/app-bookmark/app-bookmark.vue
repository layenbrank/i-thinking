<script setup lang="tsx">
import { Modal } from 'ant-design-vue'
import AppIcon from './app-bookmark-icon.vue'
import AppDialog from './app-bookmark-dialog.vue'
import { useAppSettings } from '@/hooks/app-settings'
import { useRefHistory, useMagicKeys, whenever, type UseRefHistoryRecord } from '@vueuse/core'

import clsx from 'clsx'
import type { SlideApp, SlideAppDialog } from '@/types/slide-app'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'app-bookmark'
})

const props = withDefaults(
  defineProps<{
    app?: SlideApp
  }>(),
  {
    app: () => ({
      id: '0',
      width: '60px',
      height: '60px',
      app: 'app-bookmark',
      round: '12px',
      size: 'medium',
      slideID: '0',
      name: 'example',
      direction: 'horizontal',
      shape: 'square',
      backgroundColor: '#ffffff4d',
      backgroundImage: null,
      textSize: '13px',
      textColor: '#ffffff',
      description: '书签',
      downloadCount: 1000
    })
  }
)

const appDialogRef = ref<SlideAppDialog>()

const mini = computed(() => props.app.size === 'mini')
const small = computed(() => props.app.size === 'small')
const medium = computed(() => props.app.size === 'medium')
const large = computed(() => props.app.size === 'large')
const huge = computed(() => props.app.size === 'huge')
const massive = computed(() => props.app.size === 'massive')
const ultra = computed(() => props.app.size === 'ultra')
const circle = computed(() => props.app.shape === 'circle')
const rectangle = computed(() => props.app.shape === 'rectangle')
const square = computed(() => props.app.shape === 'square')
const horizontal = computed(() => props.app.direction === 'horizontal')
const vertical = computed(() => props.app.direction === 'vertical')
const round = computed(() => props.app.round ?? 'var(--app-global-round)')
const background = computed(() => {
  if (props.app.backgroundImage) {
    return `url(${props.app.backgroundImage}) no-repeat center / cover`
  } else if (props.app.backgroundColor) return props.app.backgroundColor
  else return '#ffffff'
})

const { appStyle } = useAppSettings({
  width: computed(() => props.app.width ?? 'var(--app-global-width)'),
  height: computed(() => props.app.height ?? 'var(--app-global-height)'),
  mini,
  small,
  medium,
  large,
  huge,
  massive,
  ultra,
  circle,
  rectangle,
  square,
  horizontal,
  vertical
})

function handleAppDialog() {
  appDialogRef.value = Modal.info({
    icon: null,
    title: null,
    footer: null,
    width: '80%',
    centered: true,
    maskClosable: true,
    class: clsx('app-dialog', 'bookmark-dialog'),
    content() {
      return <AppDialog appDialogRef={appDialogRef.value} />
    }
  })
}
</script>

<template>
  <div
    :style="{
      '--app-round': round,
      '--app-size-width': appStyle.width,
      '--app-size-height': appStyle.height,
      '--app-grid-row': appStyle.gridRow,
      '--app-grid-column': appStyle.gridColumn,
      '--app-background': background
    }"
    :class="['app-bookmark', app.size, app.shape, app.direction]"
  >
    <AppIcon
      :mini="mini"
      :small="small"
      :medium="medium"
      :large="large"
      :huge="huge"
      :massive="massive"
      :ultra="ultra"
      :circle="circle"
      :rectangle="rectangle"
      :square="square"
      :horizontal="horizontal"
      :vertical="vertical"
      :url="app.url"
      :icon="app.icon"
      :size="app.size"
      :shape="app.shape"
      :direction="app.direction"
      @click="handleAppDialog"
    />
    <span class="app-name">{{ app.name }}</span>
    <IconLocalClose class="app-trash-icon" />
  </div>
</template>

<style lang="scss" scoped>
.app-bookmark {
  width: var(--app-size-width);
  height: var(--app-size-height);
  grid-row: var(--app-grid-row);
  grid-column: var(--app-grid-column);
  border-radius: var(--app-round);
}
</style>
<style lang="scss">
.app-dialog.bookmark-dialog {
  div[tabindex='0'][style='outline: none;'] {
    @apply w-full h-full;
  }

  .ant-modal-content,
  .ant-modal-body,
  .ant-modal-confirm-body-wrapper,
  .ant-modal-confirm-body,
  .ant-modal-confirm-content {
    @apply w-full h-full;
  }

  .ant-modal-content {
    @apply bg-transparent;
  }

  .ant-modal-body {
    @apply bg-black bg-opacity-30 backdrop-blur-md rounded-lg;
  }
}
</style>
