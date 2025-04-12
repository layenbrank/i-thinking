<script setup lang="ts">
import { Folder } from '@vicons/ionicons5'

defineOptions({
  name: 'app-bookmark-icon'
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
  <div :class="['app-bookmark-icon', size, shape, direction]">
    <Folder class="folder" />
  </div>
</template>

<style lang="scss" scoped>
.app-bookmark-icon {
  border-radius: var(--app-round);
  @apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;

  .folder {
    @apply w-full h-full text-[30px] text-[#ffd766] p-5;
  }
}
</style>
