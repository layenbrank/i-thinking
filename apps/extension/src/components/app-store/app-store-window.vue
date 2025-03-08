<script setup lang="ts">
defineOptions({
  name: 'AppStoreWindow'
})
</script>

<template>
  <n-tabs placement="left" type="segment" class="application-window">
    <n-tab-pane name="tab1" tab="Tab 1">Tab 1</n-tab-pane>
    <n-tab-pane name="tab2" tab="Tab 2">Tab 2</n-tab-pane>
    <n-tab-pane name="tab3" tab="Tab 3">Tab 3</n-tab-pane>
    <n-tab-pane name="tab4" tab="Tab 4">Tab 4</n-tab-pane>
    <n-tab-pane name="tab5" tab="Tab 5">Tab 5</n-tab-pane>
    <n-tab-pane name="tab6" tab="Tab 6">Tab 6</n-tab-pane>
  </n-tabs>
</template>

<style lang="scss" scoped>
.application-window {
  @apply h-full;

  .n-tabs-nav {
    .n-tabs-nav-scroll-wrapper {
    }
  }

  .n-tab-pane {
    @apply h-full bg-red-300;
  }
}
</style>
