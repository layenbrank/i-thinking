<script setup lang="ts">
import type { Dayjs } from 'dayjs'
import type { CalendarMode } from 'ant-design-vue/es/calendar/generateCalendar'
import { timeSphere } from '@desktop-widgets/core'

defineOptions({
  name: 'app-calendar-icon'
})

const props = withDefaults(
  defineProps<{
    backgroundColor: string | null
    backgroundImage: string | null
    size: AppSize
    url?: string
    icon?: string
    direction: AppDirection
    shape: AppShape
  }>(),
  {}
)

const value = ref<Dayjs>(timeSphere.now())

const mini = computed(() => props.size === 'mini')
const small = computed(() => props.size === 'small')
const medium = computed(() => props.size === 'medium')
const large = computed(() => props.size === 'large')
const huge = computed(() => props.size === 'huge')
const massive = computed(() => props.size === 'massive')
const ultra = computed(() => props.size === 'ultra')
const circle = computed(() => props.shape === 'circle')
const rectangle = computed(() => props.shape === 'rectangle')
const square = computed(() => props.shape === 'square')
const horizontal = computed(() => props.direction === 'horizontal')
const vertical = computed(() => props.direction === 'vertical')
</script>

<template>
  <div :class="['app-calendar-icon', size, shape, direction]">
    <a-calendar
      :disabled-date="() => true"
      :header-render="() => ''"
      :value="value"
      :fullscreen="false"
    >
    </a-calendar>
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

.app-calendar-icon {
  border-radius: var(--app-round);
}
</style>
