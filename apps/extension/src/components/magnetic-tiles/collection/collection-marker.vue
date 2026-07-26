<script setup lang="ts">
import { injectStore } from '@/components/magnetic-tiles/collection/collection.ts'
import { useMirrorStore } from '@/stores/mirror.ts'
import { Icon } from '@iconify/vue'
import { useDropZone } from '@vueuse/core'

defineOptions({
  name: 'collection-marker'
})

const props = withDefaults(
  defineProps<{
    id: string
    size: Mirror.Size
    shape: Mirror.Shape
    direction: Mirror.Direction
  }>(),
  {}
)

const { navigations } = injectStore()

const mirrorStore = useMirrorStore()

const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')

const { isOverDropZone } = useDropZone(dropZoneRef, {
  dataTypes: ['text/plain'],
  onDrop(files, event) {
    const targetID = props.id
    const sourceID = event.dataTransfer?.getData('text/plain')

    if (!sourceID) return
    if (sourceID === targetID) return

    void mirrorStore.toReadMagneticTile([sourceID]).then(function (values) {
      const magneticTiles = values.filter(Boolean)
      if (!magneticTiles.length) return

      const [magneticTile] = magneticTiles
      if (!magneticTile) return

      const isNavigation = magneticTile.component === 'navigation'
      if (isNavigation) void handleNavigation(sourceID, targetID)
    })
  }
})

async function handleNavigation(sourceID: string, targetID: string) {
  await mirrorStore.toUpdateMagneticTile([
    {
      key: sourceID,
      changes: {
        collectionID: targetID
      }
    }
  ])
}
</script>

<template>
  <div
    ref="dropZoneRef"
    class="collection-marker"
    :class="{
      isOverDropZone: isOverDropZone
    }">
    <Icon
      icon="mdi:folder-multiple"
      class="marker-collection" />
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

.collection-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--magnetic-tile-round);
  background: var(--magnetic-tile-background);

  &.isOverDropZone {
    box-shadow: 0px 0px 1px 3px #4080ff;
  }

  .marker-collection {
    width: 100%;
    height: 100%;
  }
}
</style>
