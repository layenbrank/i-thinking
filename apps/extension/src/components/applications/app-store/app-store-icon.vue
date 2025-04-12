<script setup lang="ts">
import { Add } from '@vicons/ionicons5'
defineOptions({
  name: 'app-store-icon'
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
  <div :class="['app-store-icon', size, shape, direction]">
    <Add />
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

.app-store-icon {
  border-radius: var(--app-round);
  @apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;
}
</style>
