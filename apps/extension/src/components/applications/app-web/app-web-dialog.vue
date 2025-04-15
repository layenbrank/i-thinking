<script setup lang="ts">
import type { SlideAppDialog } from '@/types/slide-app'

defineOptions({
  name: 'app-web-dialog'
})

const props = withDefaults(
  defineProps<{
    appDialogRef?: SlideAppDialog
  }>(),
  {}
)

function handler() {
  const random = Math.floor(Math.random() * 100)

  props.appDialogRef?.update({
    title: 'modal inner' + random
  })
}
</script>

<template>
  <div class="app-web-dialog">
    <a-button @click="handler"> modal inner </a-button>
  </div>
</template>

<style lang="scss" scoped>
.app-web-dialog {
  @apply w-full h-full;
}
</style>
