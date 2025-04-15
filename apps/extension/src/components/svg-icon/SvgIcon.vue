<script setup lang="ts">
defineOptions({
  name: 'SvgIcon'
})

const props = withDefaults(
  defineProps<{
    prefix?: string
    name: string
    color?: string
    size?: number
  }>(),
  {
    prefix: 'icon',
    color: 'currentColor',
    size: 16
  }
)

const symbolId = computed(() => `#${props.prefix}-${props.name}`)
</script>

<template>
  <svg v-bind="$attrs" aria-hidden="true">
    <use :href="symbolId" :fill="color" />
  </svg>
</template>

<style lang="scss" scoped></style>
