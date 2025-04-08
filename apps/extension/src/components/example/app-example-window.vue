<script setup lang="ts">
defineOptions({
  name: 'app-example-window'
})

const props = withDefaults(
  defineProps<{
    appWindowRef?: AppWindowType
  }>(),
  {}
)

function handler() {
  const random = Math.floor(Math.random() * 100)

  props.appWindowRef?.update({
    title: 'modal inner' + random
  })
}
</script>

<template>
  <div class="app-example-window">
    <a-button @click="handler"> modal inner </a-button>
  </div>
</template>

<style lang="scss" scoped>
.app-example-window {
  @apply w-full h-[600px];
}
</style>
