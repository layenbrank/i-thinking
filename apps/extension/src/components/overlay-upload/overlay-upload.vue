<script setup lang="ts">
defineOptions({
  name: 'overlay-upload'
})
</script>

<template>
  <div class="overlay-upload">overlay-upload</div>
</template>

<style lang="scss" scoped module>
.overlay-upload {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}
</style>
