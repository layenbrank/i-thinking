<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'marketplace-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
  <div class="marketplace-marker">
    <Icon
      icon="ant-design:appstore-twotone"
      class="marker-marketplace" />
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

.marketplace-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--application-round);
  background: var(--application-background);

  .marker-marketplace {
    width: 100%;
    height: 100%;
  }
}
</style>
