<script setup lang="tsx">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import Marker from '@/components/applications/settings/settings-marker.vue'
import Overlay from '@/components/applications/settings/settings-overlay.vue'
import { useStore } from '@/components/applications/settings/settings.ts'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
  name: 'settings'
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
        index: 0,
        title: '设置',
        round: '12px',
        mirrorID: '0',
        textSize: '13px',
        description: '设置',
        downloadCount: 1000,
        textColor: '#ffffff',
        component: 'settings',
        background: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        backdrop: null
      }
      return DEFAULT
    }
  }
)

const visible = ref(false)
const fullscreen = ref(false)
const { dispose } = useStore()

const { style } = useApplication(props.application)

function updateOverlay(value: boolean) {
  visible.value = value
}

function updateFullScreen(value: boolean) {
  fullscreen.value = value
}

onUnmounted(function () {
  dispose()
})
</script>

<template>
  <div
    :style="style"
    class="settings">
    <a-modal
      width="80%"
      :icon="null"
      :title="null"
      :footer="null"
      :open="visible"
      :centered="true"
      :closable="false"
      :mask-closable="true"
      :destroy-on-close="false"
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
      class="application-overlay settings-overlay">
      <Overlay
        :fullscreen="fullscreen"
        @update:visible="updateOverlay"
        @update:fullscreen="updateFullScreen" />
    </a-modal>
    <Marker
      @dblclick="updateOverlay(true)"
      :class="[size, shape, direction]" />
    <span class="application-title">{{ application.title }}</span>
    <destroy-mark class="application-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.settings {
  @extend %application;
}
</style>
<style lang="scss">
.application-overlay.settings-overlay {
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
    // background-color: rgba($color: #000000, $alpha: 0.05);
  }

  .ant-modal-body {
    background-color: transparent;
    border-radius: var(--application-global-overlay-round);
    // background-color: rgba($color: #ffffff, $alpha: 1);
  }
}
</style>
