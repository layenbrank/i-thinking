<script setup lang="ts">
import { Folder } from '@vicons/ionicons5'

defineOptions({
  name: 'app-bookmark-icon'
})

withDefaults(
  defineProps<{
    appSize: AppSize
  }>(),
  {}
)
</script>

<template>
  <div :class="['app-bookmark-icon', appSize]">
    <Folder class="folder" />
  </div>
</template>

<style lang="scss" scoped>
.app-bookmark-icon {
  @apply w-full h-full bg-white bg-opacity-30 flex items-center justify-center rounded-lg cursor-pointer;

  .folder {
    @apply text-[30px] text-[#ffd766];
  }

  &.mini {
  }

  &.small {
  }

  &.middle {
  }

  &.large {
  }

  &.huge {
  }
}
</style>
