<script setup lang="ts">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import Marker from '@/components/magnetic-tiles/collection/collection-marker.vue'
import Overlay from '@/components/magnetic-tiles/collection/collection-overlay.vue'
import { provideStore } from '@/components/magnetic-tiles/collection/collection.ts'
import { Modal } from 'ant-design-vue'
import { Icon } from '@iconify/vue/offline'
import { useMagneticTile } from '@/hooks/magnetic-tile.ts'

defineOptions({
  name: 'collection'
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
        title: '集合应用',
        mirrorID: '0',
        textSize: '13px',
        textColor: '#ffffff',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        component: 'collection',
        description: '集合应用',
        downloadCount: 1000,
        background: null,
        backdrop: null
      }
      return DEFAULT
    }
  }
)

provideStore(props.application.id)

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
    class="collection">
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
        transformOrigin: 'center',
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundOrigin: 'content-box',
        backgroundClip: 'content-box',
        backgroundPosition: 'center'
      }"
      class="magnetic-tile-overlay collection-overlay">
      <Overlay
        :id="application.id"
        :name="application.title"
        :fullscreen="fullscreen"
        @update:visible="updateOverlay"
        @update:fullscreen="updateFullScreen" />
    </Modal>
    <Marker
      :size="size"
      :shape="shape"
      :direction="direction"
      :id="application.id"
      @dblclick="updateOverlay(true)"
      :class="[size, shape, direction]" />
    <span class="magnetic-tile-title">{{ application.title }}</span>
    <Icon icon="custom:close" class="magnetic-tile-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.collection {
  @extend %magnetic-tile;
}
</style>
<style lang="scss">
.magnetic-tile-overlay.collection-overlay {
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
    // background-color: transparent;
    backdrop-filter: blur(21px);
    background-color: hsla(0, 0%, 100%, 0.5);
  }

  .ant-modal-body {
    // background-color: rgba($color: #ffffff, $alpha: 1);
    background-color: transparent;
    border-radius: var(--magnetic-tile-global-overlay-round);
  }
}
</style>
