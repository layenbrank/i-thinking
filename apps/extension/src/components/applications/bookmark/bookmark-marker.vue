<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
	name: 'bookmark-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="bookmark-marker">
		<Icon icon="ant-design:folder-add-filled" class="marker-bookmark" />
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

.bookmark-marker {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--application-round);
	background: var(--application-background);

	// .folder {
	// 	@apply w-full h-full text-[30px] text-[#ffd766];
	// }
	.marker-bookmark {
		width: 100%;
		height: 100%;
		color: #ffd766;
	}
}
</style>
