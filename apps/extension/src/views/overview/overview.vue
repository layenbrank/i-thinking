<script setup lang="ts">
import type { CSSProperties } from 'vue'
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import { Modal } from 'ant-design-vue'
import OverviewPrefix from './components/overview-prefix.vue'
import OverviewCore from './components/overview-core.vue'
import OverviewSuffix from './components/overview-suffix.vue'

defineOptions({
  name: 'overview'
})

const style: Readonly<CSSProperties> = {
  backgroundImage: `url(${backgroundImage})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundAttachment: 'fixed',
  backgroundOrigin: 'content-box',
  backgroundClip: 'content-box',
  backgroundPosition: 'center'
}

onUnmounted(Modal.destroyAll)
</script>

<template>
  <a-layout
    :style="style"
    class="overview">
    <OverviewPrefix></OverviewPrefix>
    <OverviewCore></OverviewCore>
    <OverviewSuffix></OverviewSuffix>
  </a-layout>
</template>

<style lang="scss" scoped>
@use 'overview.scss';

.overview {
  width: 100%;
  height: 100%;
  background-color: transparent;
  overflow: hidden;
}
</style>
