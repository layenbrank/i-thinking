<script setup lang="tsx">
import clsx from 'clsx'
import { Modal } from 'ant-design-vue'
import AppIcon from './app-calendar-icon.vue'
import AppDialog from './app-calendar-dialog.vue'
import { useAppSettings } from '@/hooks/app-settings'
import type { SlideApp, SlideAppDialog } from '@/types/slide-app'

defineOptions({
  name: 'app-calendar'
})

const props = withDefaults(
  defineProps<{
    slideApp?: SlideApp
    settingsVisible?: boolean
  }>(),
  {
    slideApp: () => ({
      id: '0',
      width: '60px',
      height: '60px',
      app: 'app-calendar',
      round: '12px',
      slideID: '0',
      sort: 0,
      size: 'medium',
      name: '示例',
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

const mini = computed(() => props.slideApp.size === 'mini')
const small = computed(() => props.slideApp.size === 'small')
const medium = computed(() => props.slideApp.size === 'medium')
const large = computed(() => props.slideApp.size === 'large')
const huge = computed(() => props.slideApp.size === 'huge')
const massive = computed(() => props.slideApp.size === 'massive')
const ultra = computed(() => props.slideApp.size === 'ultra')
const circle = computed(() => props.slideApp.shape === 'circle')
const rectangle = computed(() => props.slideApp.shape === 'rectangle')
const square = computed(() => props.slideApp.shape === 'square')
const horizontal = computed(() => props.slideApp.direction === 'horizontal')
const vertical = computed(() => props.slideApp.direction === 'vertical')
const round = computed(() => props.slideApp.round ?? 'var(--app-global-round)')
const background = computed(() => {
  if (props.slideApp.backgroundImage) {
    return `url(${props.slideApp.backgroundImage}) no-repeat center / cover`
  } else if (props.slideApp.backgroundColor) return props.slideApp.backgroundColor
  else return '#ffffff'
})

const { appStyle } = useAppSettings({
  width: computed(() => props.slideApp.width ?? 'var(--app-global-width)'),
  height: computed(() => props.slideApp.height ?? 'var(--app-global-height)'),
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
  if (props.settingsVisible) return
  if (medium.value && rectangle.value) return
  appDialogRef.value = Modal.info({
    icon: null,
    title: null,
    footer: null,
    width: '80%',
    centered: true,
    maskClosable: true,
    class: clsx('app-dialog calendar-dialog'),
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
    :class="['app-calendar', slideApp.size, slideApp.shape, slideApp.direction]"
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
      :url="slideApp.url"
      :icon="slideApp.icon"
      :size="slideApp.size"
      :shape="slideApp.shape"
      :direction="slideApp.direction"
      @click="handleAppDialog"
    />
    <span class="app-name">{{ slideApp.name }}</span>
    <IconLocalClose class="app-trash-icon" />
  </div>
</template>

<style lang="scss" scoped>
.app-calendar {
  width: var(--app-size-width);
  height: var(--app-size-height);
  grid-row: var(--app-grid-row);
  grid-column: var(--app-grid-column);
  border-radius: var(--app-round);
  background: var(--app-background);
}
</style>
<style lang="scss">
.app-dialog.calendar-dialog {
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
    @apply bg-white rounded-lg;
  }
}
</style>
