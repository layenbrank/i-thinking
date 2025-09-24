<script setup lang="ts">
import { useMarkdownStore } from '@/stores/markdown.ts'
defineOptions({
	name: 'app-markdown-icon'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
const store = useMarkdownStore()

const markdown = computed(function () {
	return store.markdowns?.find(function (value) {
		return value.id === store.activeKey
	})
})
</script>

<template>
	<div class="app-markdown-icon">
		{{ store.findHead(markdown) }}
	</div>
</template>

<style lang="scss" scoped>
@use 'mini.scss' as *;
@use 'small.scss' as *;
@use 'medium.scss' as *;
@use 'large.scss' as *;
@use 'huge.scss' as *;
@use 'massive.scss' as *;
@use 'ultra.scss' as *;

.app-markdown-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--app-round);
	background: var(--app-background);

	text-wrap: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
}
</style>
