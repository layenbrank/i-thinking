<script setup lang="tsx">
import Marker from '@/components/applications/calendar/calendar-marker.vue'
import Overlay from '@/components/applications/calendar/calendar-overlay.vue'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
  name: 'calendar'
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
        index: 0,
        title: '日历',
        round: '12px',
        mirrorID: '0',
        textSize: '13px',
        backdrop: null,
        textColor: '#ffffff',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        component: 'calendar',
        background: null,
        description: '日历',
        collectionID: null,
        downloadCount: 1000
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

onMounted(function () {
  console.log(props.size, props.shape, props.direction)
})
</script>

<template>
  <div
    :style="style"
    class="calendar">
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
      class="application-overlay calendar-overlay">
      <Overlay
        :fullscreen="fullscreen"
        @update:visible="updateOverlay"
        @update:fullscreen="updateFullScreen" />
    </a-modal>

    <Marker
      :size="props.size"
      :shape="props.shape"
      @dblclick="updateOverlay(true)"
      :class="[size, shape, direction]" />
    <span class="application-title">{{ application.title }}</span>
    <destroy-mark class="application-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.calendar {
  @extend %application;
}
</style>
<style lang="scss">
.application-overlay.calendar-overlay {
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
    background-color: #ffffff;
    border-radius: 8px;
  }
}
</style>
