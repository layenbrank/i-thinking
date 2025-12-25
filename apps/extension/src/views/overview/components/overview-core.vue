<script setup lang="ts">
import { useMirrorStore } from '@/stores/mirror.ts'

const Controller = defineAsyncComponent(function () {
  return import('@/components/controller/controller.vue')
})

defineOptions({
  name: 'overview-core'
})

const mirrorStore = useMirrorStore()
</script>

<template>
  <a-layout
    @contextmenu.prevent
    class="overview-core">
    <template
      v-for="value in mirrorStore.mirrors"
      :key="value.id">
      <div
        v-if="value.id === mirrorStore.mirrorID"
        class="mirror">
        <Controller
          :size="value.size"
          :shape="value.shape"
          :direction="value.direction" />
      </div>
    </template>
  </a-layout>
</template>

<style lang="scss" scoped>
@use '../overview.scss';

.overview-core {
  width: 100%;
  height: calc(100% - overview.$top-height);
  flex: none;
  background-color: transparent;

  .mirror {
    width: 100%;
    height: 100%;
    overflow: hidden scroll;
  }
}
</style>
