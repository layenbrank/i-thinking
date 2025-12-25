<script setup lang="tsx">
import Marker from '@/components/applications/navigation/navigation-marker.vue'
import { message } from 'ant-design-vue'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
  name: 'navigation'
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
        title: '导航',
        round: '12px',
        mirrorID: '0',
        textSize: '13px',
        description: '导航',
        downloadCount: 1000,
        textColor: '#ffffff',
        background: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        component: 'navigation',
        backdrop: null
      }
      return DEFAULT
    }
  }
)

const { style } = useApplication(props.application)

function handleJumpLink() {
  if (!props.application.url) return message.error('请先设置链接地址!')

  window.open(props.application.url, '_blank')
}
</script>

<template>
  <div
    :style="style"
    class="navigation">
    <Marker
      :mark="application.mark"
      :title="application.title"
      :id="application.id"
      @dblclick="handleJumpLink"
      :class="[size, shape, direction]" />
    <span class="application-title">{{ application.title }}</span>
    <destroy-mark class="application-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.navigation {
  @extend %application;
}
</style>
