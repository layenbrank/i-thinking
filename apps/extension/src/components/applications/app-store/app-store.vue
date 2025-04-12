<script setup lang="tsx">
import clsx from 'clsx'
import { Modal } from 'ant-design-vue'
import AppIcon from './app-store-icon.vue'
import AppDialog from './app-store-dialog.vue'
import { useAppSettings } from '@/hooks/app-settings'

defineOptions({
  name: 'app-store'
})

const props = withDefaults(
  defineProps<{
    app?: AppOptions
  }>(),
  {
    app: () => ({
      id: '0',
      width: '60px',
      height: '60px',
      app: 'app-store',
      round: '12px',
      size: 'medium',
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

const appDialogRef = ref<AppDialog>()

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
    centered: true,
    width: '80%',
    maskClosable: true,
    class: clsx('app-dialog store-dialog'),
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
      '--app-grid-column': appStyle.gridColumn
    }"
    :class="['app-store', app.size, app.shape, app.direction]"
  >
    <AppIcon
      :url="app.url"
      :icon="app.icon"
      :size="app.size"
      :shape="app.shape"
      :direction="app.direction"
      :background-color="app.backgroundColor"
      :background-image="app.backgroundImage"
      @click="handleAppDialog"
    />
    <span class="app-name">{{ app.name }}</span>
    <IconLocalClose class="app-trash-icon" />
  </div>
</template>

<style lang="scss" scoped>
.app-store {
  width: var(--app-size-width);
  height: var(--app-size-height);
  grid-row: var(--app-grid-row);
  grid-column: var(--app-grid-column);
  border-radius: var(--app-round);
}
</style>
<style lang="scss">
.app-dialog.store-dialog {
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
