<script setup lang="ts">
defineOptions({
	name: 'NotFoundView'
})
</script>

<template>
	<div class="not-found-view">
		<a-result status="404" title="404 资源不存在" description="生活总归带点荒谬">
			<a-button @click="$router.push('/')">找点乐子吧</a-button>
		</a-result>
	</div>
</template>

<style lang="scss" scoped></style>
