<script setup lang="ts">
import {} from '@tiptap/core'
import { Editor } from '@tiptap/vue-3'

defineOptions({
	name: 'app-notepad-dialog'
})

const props = withDefaults(
	defineProps<{
		appDialogRef?: ApplicationDialog
	}>(),
	{}
)
</script>

<template>
	<div class="app-notepad-dialog">
		<Editor />
	</div>
</template>

<style lang="scss" scoped>
.app-notepad-dialog {
	@apply w-full h-full flex items-center justify-center;
}
</style>
