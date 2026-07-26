<script setup lang="ts">
import { useMirrorStore } from '@/stores/mirror.ts'
import type { SegmentedProps } from 'ant-design-vue'
import { isString } from 'lodash-es'

defineOptions({
  name: 'setting-direction'
})

const mirrorStore = useMirrorStore()

const options: Mirror.Direction[] = ['horizontal', 'vertical']
const segmented = computed(function () {
  const mirror = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })
  return mirror?.direction ?? 'horizontal'
})

function updateSegmented(value: SegmentedProps['value']) {
  if (!value) return
  if (!isString(value)) return
  if (!options.includes(value as Mirror.Direction)) return

  const updateSpec = mirrorStore.mirrors?.find(function (mirror) {
    return mirror.id === mirrorStore.mirrorID
  })

  if (!updateSpec) return

  void mirrorStore.toUpdateMirror([
    {
      key: updateSpec.id,
      changes: {
        direction: value as Mirror.Direction
      }
    }
  ])
}
</script>

<template>
  <div class="setting-direction">
    <a-segmented
      :value="segmented"
      @update:value="updateSegmented"
      :options="options" />
  </div>
</template>

<style lang="scss" scoped>
.setting-direction {
}
</style>
