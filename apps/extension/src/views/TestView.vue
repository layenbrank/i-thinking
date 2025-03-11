<script lang="ts" setup>
import Sortable from 'sortablejs'

onMounted(() => {
  const treeRoot = document.querySelector('#tree-root') as HTMLElement
  Sortable.utils.on(treeRoot, 'click', function (e) {
    console.log('click', e)
  })
})
</script>

<template>
  <div id="tree-root"></div>
</template>

<style lang="scss" scoped>
#tree-root {
  width: 100%;
  height: 100%;
  border: 1px solid #000;
}
</style>
