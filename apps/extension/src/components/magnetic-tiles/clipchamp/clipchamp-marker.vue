<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'clipchamp-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
  <div class="clipchamp-marker">
    <Icon
      icon="mdi:video-box"
      class="marker-clipchamp" />
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

.clipchamp-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--magnetic-tile-round);
  background: var(--magnetic-tile-background);

  .marker-clipchamp {
    width: 100%;
    height: 100%;
  }
}
</style>
