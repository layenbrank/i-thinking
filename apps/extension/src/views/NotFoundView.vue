<script setup lang="ts">
defineOptions({
  name: 'NotFoundView'
})
</script>

<template>
  <n-result status="404" title="404 资源不存在" description="生活总归带点荒谬">
    <template #footer>
      <n-button>找点乐子吧</n-button>
    </template>
  </n-result>
</template>

<style lang="scss" scoped></style>
