<script setup lang="ts">
import { Add } from '@vicons/ionicons5'
defineOptions({
  name: 'AppStoreIcon'
})
</script>

<template>
  <div
    class="w-full h-full bg-gray-300 bg-opacity-30 flex items-center justify-center rounded-lg cursor-pointer"
  >
    <n-icon size="40">
      <Add />
    </n-icon>
  </div>
</template>

<style lang="scss" scoped></style>
