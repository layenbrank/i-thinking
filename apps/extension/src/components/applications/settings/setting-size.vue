<script setup lang="ts">
import { useMirrorStore } from '@/stores/mirror.ts'
import type { SegmentedProps } from 'ant-design-vue'
import { isString } from 'lodash-es'

defineOptions({
  name: 'setting-size'
})

const mirrorStore = useMirrorStore()

const options: Mirror.Size[] = ['mini', 'small', 'medium', 'large', 'huge', 'massive', 'ultra']
const segmented = computed(function () {
  const mirror = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })
  return mirror?.size ?? 'mini'
})

function updateSegmented(value: SegmentedProps['value']) {
  if (!value) return
  if (!isString(value)) return
  if (!options.includes(value as Mirror.Size)) return

  const updateSpec = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })

  if (!updateSpec) return

  void mirrorStore.toUpdateMirror([
    {
      key: updateSpec.id,
      changes: {
        size: value as Mirror.Size
      }
    }
  ])
}
</script>

<template>
  <div class="setting-size">
    <a-segmented
      :value="segmented"
      @update:value="updateSegmented"
      :options="options" />
  </div>
</template>

<style lang="scss" scoped>
.setting-size {
}
</style>
