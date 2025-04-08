<script setup lang="ts">
defineOptions({
  name: 'app-example-icon'
})

withDefaults(
  defineProps<{
    appSize: AppSize
  }>(),
  {}
)
</script>

<template>
  <div :class="['app-example-icon', appSize]">test</div>
</template>

<style lang="scss" scoped>
.app-example-icon {
  &.mini {
  }

  &.small {
  }

  &.middle {
  }

  &.large {
  }

  &.huge {
  }
}
</style>
