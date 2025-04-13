<script setup lang="ts">
import fallback from '@/assets/feedback/fallback.png'
import type { SlideAppDirection, SlideAppShape, SlideAppSize } from '@/types/slide-app'
defineOptions({
  name: 'app-web-icon'
})

const props = withDefaults(
  defineProps<{
    size: SlideAppSize
    url?: string
    icon?: string
    direction: SlideAppDirection
    shape: SlideAppShape
    mini: boolean
    small: boolean
    medium: boolean
    large: boolean
    huge: boolean
    massive: boolean
    ultra: boolean
    circle: boolean
    rectangle: boolean
    square: boolean
    horizontal: boolean
    vertical: boolean
  }>(),
  {}
)
</script>

<template>
  <div :class="['app-web-icon', size, shape, direction]">
    <a-image :preview="false" :fallback="fallback" :src="icon" wrapper-class-name="app-web-image">
      <template #placeholder>
        <a-skeleton-image active class="app-web-placeholder" />
      </template>
    </a-image>
  </div>
</template>

<style lang="scss" scoped>
@use './app-mini.scss' as *;
@use './app-small.scss' as *;
@use './app-medium.scss' as *;
@use './app-large.scss' as *;
@use './app-huge.scss' as *;
@use './app-massive.scss' as *;
@use './app-ultra.scss' as *;

.app-web-icon {
  border-radius: var(--app-round);

  &.circle {
    border-radius: calc(var(--app-size-width) / 2);
  }

  @apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;

  :deep(.app-web-image) {
    @apply w-full h-full;
    border-radius: var(--app-round);
  }

  :deep(.app-web-placeholder) {
    width: 100%;
    height: 100%;
    display: block;

    .ant-skeleton-image {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
