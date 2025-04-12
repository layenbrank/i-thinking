<script setup lang="ts">
defineOptions({
  name: 'app-example-dialog'
})

const props = withDefaults(
  defineProps<{
    appDialogRef?: AppDialog
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
  <div class="app-example-dialog">
    <a-button @click="handler">modal inner</a-button>
  </div>
</template>

<style lang="scss" scoped>
.app-example-dialog {
  @apply w-full h-full flex items-center justify-center;
}
</style>
