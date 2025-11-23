<script setup lang="ts">
import { useMarkdownStore } from '@/stores/markdown.ts'
import { Icon } from '@iconify/vue'

defineOptions({
	name: 'markdown-marker'
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
	<div class="markdown-marker">
		<Icon icon="mdi:note-edit" class="marker-markdown"></Icon>
		<!-- {{ store.findHead(markdown) }} -->
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

.markdown-marker {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--application-round);
	background: var(--application-background);

	text-wrap: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;

	&.circle {
		border-radius: calc(var(--application-size-width) / 2);
	}

	.marker-markdown {
		width: 100%;
		height: 100%;
	}
}
</style>
