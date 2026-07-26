<script setup lang="ts">
defineOptions({
  name: 'intelligence-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
  <div class="intelligence-marker">test</div>
</template>

<style lang="scss" scoped>
@use 'mini.scss' as *;
@use 'small.scss' as *;
@use 'medium.scss' as *;
@use 'large.scss' as *;
@use 'huge.scss' as *;
@use 'massive.scss' as *;
@use 'ultra.scss' as *;

.intelligence-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--magnetic-tile-round);
  background: var(--magnetic-tile-background);
}
</style>
