<script setup lang="ts">
defineOptions({
  name: 'TestComponent'
})

withDefaults(
  defineProps<{
    msg: string
  }>(),
  {}
)
</script>

<template>
  <div class="test-component">{{ msg }}</div>
</template>

<style lang="scss" scoped></style>
