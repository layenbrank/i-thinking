<script setup lang="ts">
interface Props {
  prefix?: string
  name: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'icon',
  color: '',
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)
</script>
<template>
  <svg aria-hidden="true" class="svg-icon">
    <use :href="symbolId" :fill="color" />
  </svg>
</template>

<style lang="scss" scoped>
.svg-icon {
  width: 1rem;
  height: 1rem;
  vertical-align: -0.15rem;
  fill: currentColor;
  overflow: hidden;
}
</style>
