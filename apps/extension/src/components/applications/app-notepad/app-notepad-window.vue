<script setup lang="ts">
// import {} from '@tiptap/core'
import { Editor } from '@tiptap/vue-3'

defineOptions({
	name: 'app-notepad-window'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="app-notepad-window">
		<Editor />
	</div>
</template>

<style lang="scss" scoped>
.app-notepad-window {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
