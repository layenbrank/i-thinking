<script setup lang="ts">
import { timeSphere } from '@i-thinking/utils'
import type { Dayjs } from 'dayjs'

defineOptions({
  name: 'calendar-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const now = ref<Dayjs>(timeSphere.now())
</script>

<template>
  <div class="calendar-overlay">
    <a-calendar
      :fullscreen="false"
      v-model:value="now"
      :header-render="() => ''"
      :disabled-date="undefined"
      class="overlay-calendar">
    </a-calendar>
  </div>
</template>

<style lang="scss" scoped>
.calendar-overlay {
  width: 100%;
  height: 100%;

  .overlay-calendar {
    width: 100%;
    height: 100%;
  }

  :deep(.ant-picker-panel) {
    width: 100%;
    height: 100%;
  }

  :deep(.ant-picker-date-panel) {
    width: 100%;
    height: 100%;
  }

  :deep(.ant-picker-body) {
    width: 100%;
    height: 100%;
  }

  :deep(.ant-picker-content) {
    width: 100%;
    height: 100%;
  }
}
</style>
