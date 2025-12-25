<script setup lang="tsx">
import Marker from '@/components/applications/clipchamp/clipchamp-marker.vue'
import Overlay from '@/components/applications/clipchamp/clipchamp-overlay.vue'
import { Modal } from 'ant-design-vue'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
  name: 'clipchamp'
})

const props = withDefaults(
  defineProps<{
    size: Mirror.Size
    shape: Mirror.Shape
    application: Application
    direction: Mirror.Direction
  }>(),
  {
    application() {
      const DEFAULT: Application = {
        id: '0',
        url: null,
        mark: null,
        collectionID: null,
        round: '12px',
        index: 0,
        title: 'Clipchamp',
        mirrorID: '0',
        textSize: '13px',
        textColor: '#ffffff',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        component: 'clipchamp',
        description: 'Clipchamp',
        downloadCount: 1000,
        backdrop: null,
        background: null
      }
      return DEFAULT
    }
  }
)

const visible = ref(false)
const fullscreen = ref(false)
const { style } = useApplication(props.application)

function updateOverlay(value: boolean) {
  visible.value = value
}

function updateFullScreen(value: boolean) {
  fullscreen.value = value
}
</script>

<template>
  <div
    :style="style"
    class="clipchamp">
    <Modal
      width="80%"
      :icon="null"
      :title="null"
      :footer="null"
      :open="visible"
      :centered="true"
      :closable="false"
      :mask-closable="true"
      :destroy-on-close="true"
      @update:open="updateOverlay"
      :style="{
        transformOrigin: 'center'
      }"
      class="application-overlay clipchamp-overlay">
      <Overlay
        :fullscreen="fullscreen"
        @update:visible="updateOverlay"
        @update:fullscreen="updateFullScreen" />
    </Modal>
    <Marker
      @dblclick="updateOverlay(true)"
      :class="[size, shape, direction]" />
    <span class="application-title">{{ application.title }}</span>
    <destroy-mark class="application-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.clipchamp {
  @extend %application;
}
</style>
<style lang="scss">
.application-overlay.clipchamp-overlay {
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
