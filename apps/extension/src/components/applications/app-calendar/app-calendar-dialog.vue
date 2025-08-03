<script setup lang="ts">
defineOptions({
	name: 'app-calendar-dialog'
})

const props = withDefaults(
	defineProps<{
		appDialogRef?: ApplicationDialog
	}>(),
	{}
)

function handler() {
	const random = Math.floor(Math.random() * 100)

	props.appDialogRef?.update({
		title: 'modal inner' + random
	})
}
</script>

<template>
	<div class="app-calendar-dialog">
		<a-button @click="handler">modal inner</a-button>
	</div>
</template>

<style lang="scss" scoped>
.app-calendar-dialog {
	@apply w-full h-full;
}
</style>
