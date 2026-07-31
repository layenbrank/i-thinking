<script setup lang="tsx">
import Marker from '@/components/magnetic-tiles/navigation/navigation-marker.vue'
import { message } from 'ant-design-vue'
import { Icon } from '@iconify/vue/offline'
import { useMagneticTile } from '@/hooks/magnetic-tile.ts'

defineOptions({
  name: 'navigation'
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

const { style } = useMagneticTile(props.application)

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
    <span class="magnetic-tile-title">{{ application.title }}</span>
    <Icon icon="custom:close" class="magnetic-tile-trash-mark" />
  </div>
</template>

<style lang="scss" scoped>
.navigation {
  @extend %magnetic-tile;
}
</style>
