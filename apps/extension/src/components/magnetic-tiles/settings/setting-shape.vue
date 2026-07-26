<script setup lang="ts">
import { useMirrorStore } from '@/stores/mirror.ts'
import type { SegmentedProps } from 'ant-design-vue'
import { isString } from 'lodash-es'

defineOptions({
  name: 'setting-shape'
})

const mirrorStore = useMirrorStore()

const options: Mirror.Shape[] = ['circle', 'square', 'rectangle']
const segmented = computed(function () {
  const mirror = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })
  return mirror?.shape ?? 'square'
})

function updateSegmented(value: SegmentedProps['value']) {
  if (!value) return
  if (!isString(value)) return
  if (!options.includes(value as Mirror.Shape)) return

  const updateSpec = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })

  if (!updateSpec) return

  void mirrorStore.toUpdateMirror([
    {
      key: updateSpec.id,
      changes: {
        shape: value as Mirror.Shape
      }
    }
  ])
}
</script>

<template>
  <div class="setting-shape">
    <a-segmented
      :value="segmented"
      @update:value="updateSegmented"
      :options="options" />
  </div>
</template>

<style lang="scss" scoped>
.setting-shape {
}
</style>
