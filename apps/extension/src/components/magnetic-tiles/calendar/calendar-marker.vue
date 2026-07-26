<script setup lang="ts">
import { timeSphere } from '@i-thinking/utils'
import type { Dayjs } from 'dayjs'

defineOptions({
  name: 'calendar-marker'
})

const props = withDefaults(
  defineProps<{
    size: Mirror.Size
    shape: Mirror.Shape
  }>(),
  {}
)
// const emits = defineEmits<{}>()

const now = ref<Dayjs>(timeSphere.now())

const times = computed(function () {
  return now.value
    .format('YYYY-MM-DD')
    .split('-')
    .map(function (value, index) {
      // 超出两位 保留后两位
      return props.size === 'mini' && value.length === 4
        ? value.substring(2, 4)
        : value.padStart(2, '0')
    })
})
</script>

<template>
  <div class="calendar-marker">
    <template v-if="size === 'mini' && shape === 'square'">
      {{ timeSphere.format(timeSphere.now(), 'DD') }}
    </template>
    <template v-else-if="size === 'mini' && shape === 'rectangle'">
      <span
        v-for="value in times"
        :key="value"
        class="time-text">
        {{ value }}
      </span>
    </template>
    <a-calendar
      v-if="size !== 'mini'"
      :fullscreen="false"
      v-model:value="now"
      :header-render="() => ''"
      :disabled-date="undefined">
    </a-calendar>
  </div>
</template>

<style lang="scss" scoped>
@use 'mini.scss' as *;
@use 'small.scss' as *;
@use 'medium.scss' as *;
@use 'large.scss' as *;
@use 'huge.scss' as *;
@use 'massive.scss' as *;
@use 'ultra.scss' as *;

.calendar-marker {
  border-radius: var(--magnetic-tile-round);

  .ant-picker-calendar {
    @apply w-full h-full;
    background: transparent;
  }

  :deep(.ant-picker-panel) {
    @apply w-full h-full rounded-lg;
    background: transparent;
  }

  :deep(.ant-picker-date-panel) {
    @apply w-full h-full;
  }

  :deep(.ant-picker-body) {
    @apply w-full h-full p-3;
  }

  :deep(.ant-picker-content) {
    @apply h-full flex flex-col items-center justify-center gap-y-1;
  }

  :deep(thead) {
    @apply w-full block;

    tr {
      @apply w-full h-full grid grid-cols-7 gap-x-2;
    }

    tr th {
      @apply w-full block text-xs text-[#606266];
    }
  }

  :deep(tbody) {
    @apply w-full h-[calc(100%-18px)] grid grid-rows-6 gap-y-2;

    tr {
      @apply w-full h-full grid grid-cols-7 gap-x-2;
    }

    .ant-picker-cell:hover:not(.ant-picker-cell-selected):not(
        .ant-picker-cell-range-start
      ):not(.ant-picker-cell-range-end):not(
        .ant-picker-cell-range-hover-start
      ):not(.ant-picker-cell-range-hover-end)
      .ant-picker-cell-inner {
      @apply bg-black;

      .ant-picker-calendar-date-value {
        @apply text-white;
      }
    }

    tr .ant-picker-cell {
      min-height: initial;
      min-width: initial;
      @apply w-full block p-0;
    }

    .ant-picker-cell-disabled::before {
      @apply bg-transparent;
    }

    .ant-picker-cell.ant-picker-cell-today {
      .ant-picker-cell-inner {
        &::before {
          box-shadow: 0px 0px 0px 1px #0b57d0ff;
        }
      }
      .ant-picker-calendar-date-value {
        // @apply text-white;
        @apply text-black;
      }
    }

    .ant-picker-cell.ant-picker-cell-selected {
      .ant-picker-calendar-date-value {
        @apply text-white;
      }
    }

    .ant-picker-cell-inner {
      @apply w-full h-full;
      display: flex;
      min-width: initial;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: none;
      box-shadow: 0px 0px 0px 0px #0b57d0ff;
      transition:
        color 300ms,
        box-shadow 300ms,
        background-color 150ms;

      &::before {
        border: none;
      }
    }
    .ant-picker-calendar-date-value {
      @apply h-full text-xs text-black flex items-center justify-center;
    }
  }
}
</style>
