<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'settings-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
  <div class="settings-marker">
    <Icon
      icon="mdi:cog-outline"
      class="marker-settings" />
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

.settings-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--application-round);
  background: var(--application-background);

  .marker-settings {
    width: 100%;
    height: 100%;
  }
}
</style>
