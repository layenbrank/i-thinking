<script setup lang="ts">
import { Text } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'

defineOptions({
  name: 'AppIcon'
})
</script>

<template>
  <div
    class="w-full h-full bg-white bg-opacity-30 flex items-center justify-center rounded-lg cursor-pointer"
  >
    <n-icon size="40">
      <Text />
    </n-icon>
  </div>
</template>

<style lang="scss" scoped></style>
