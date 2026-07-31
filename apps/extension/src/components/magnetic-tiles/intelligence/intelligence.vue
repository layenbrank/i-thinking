<script setup lang="tsx">
import Marker from '@/components/magnetic-tiles/intelligence/intelligence-marker.vue'
import Overlay from '@/components/magnetic-tiles/intelligence/intelligence-overlay.vue'
import { Icon } from '@iconify/vue/offline'
import { useMagneticTile } from '@/hooks/magnetic-tile.ts'

defineOptions({
  name: 'intelligence'
})

const props = withDefaults(
  defineProps<{
    size: Mirror.Size
    shape: Mirror.Shape
    application: MagneticTile
    direction: Mirror.Direction
  }>(),
  {
    application() {
      const DEFAULT: MagneticTile = {
        id: '0',
        url: null,
        mark: null,
        collectionID: null,
        index: 0,
        round: '12px',
        mirrorID: '0',
        title: '智能助手',
        textSize: '13px',
        downloadCount: 1000,
        textColor: '#ffffff',
        background: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        description: '智能助手',
        component: 'intelligence',
        backdrop: null
      }
      return DEFAULT
    }
  }
)

const visible = ref(false)
const fullscreen = ref(false)

const { style } = useMagneticTile(props.application)

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
    class="intelligence">
    <a-modal
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
      class="magnetic-tile-overlay intelligence-overlay">
      <Overlay
        :fullscreen="fullscreen"
        @update:visible="updateOverlay"
        @update:fullscreen="updateFullScreen" />
    </a-modal>
    <Marker
      @dblclick="updateOverlay(true)"
      :class="[size, shape, direction]" />
    <span class="magnetic-tile-title">{{ application.title }}</span>
    <Icon icon="custom:close" class="magnetic-tile-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.intelligence {
  @extend %magnetic-tile;
}
</style>
<style lang="scss">
.magnetic-tile-overlay.intelligence-overlay {
  %size-full {
    width: 100%;
    height: 100%;
  }

  div[tabindex='0'][style='outline: none;'] {
    @extend %size-full;
  }

  .ant-modal-content,
  .ant-modal-body,
  .ant-modal-confirm-body-wrapper,
  .ant-modal-confirm-body,
  .ant-modal-confirm-content {
    @extend %size-full;
  }

  .ant-modal-content {
    background-color: transparent;
  }

  .ant-modal-body {
    border-radius: 8px;
    overflow: hidden;
    background-color: rgba($color: #ffffff, $alpha: 1);
  }
}
</style>
