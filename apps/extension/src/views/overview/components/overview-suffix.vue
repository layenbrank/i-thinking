<script setup lang="ts">
defineOptions({
  name: 'overview-suffix'
})
</script>

<template>
  <a-layout-footer
    @contextmenu.prevent
    class="overview-suffix">
    <!-- <template #default>
					<div class="dock-bar"></div>
				</template> -->
    <a
      target="_blank"
      class="text-white"
      rel="noopener noreferrer"
      href="https://beian.mps.gov.cn/#/query/webSearch">
      备案号：豫ICP备2023024760号
    </a>
  </a-layout-footer>
</template>

<style lang="scss" scoped>
@use 'sass:math';
@use '../overview.scss';

.overview-suffix {
  width: 100%;
  height: overview.$bottom-height;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: 1px solid red;

  .dock-bar {
    width: 80%;
    height: 80%;
    border-radius: math.div(overview.$bottom-height, 10);
    background-color: rgba($color: #ffffff, $alpha: 0.3);
    color: rgba(64, 128, 255, 0.8);
  }
}
</style>
