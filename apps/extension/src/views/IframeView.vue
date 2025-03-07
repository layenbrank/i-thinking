<script setup lang="ts">
defineOptions({
  name: 'IframeView'
})
const linkURL = ref('https://tbzb.taobao.com/?spm=a21bo.jianhua/a.201859.2.27cf2a89EZNLFB')
</script>
<template>
  <iframe :src="linkURL" frameborder="0" class="shop-iframe"></iframe>
</template>
<style lang="scss" scoped>
.shop-iframe {
  @apply w-full h-full;
}
</style>
