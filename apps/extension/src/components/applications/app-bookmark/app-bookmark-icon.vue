<script setup lang="ts">
import { Folder } from '@vicons/ionicons5'

defineOptions({
	name: 'app-bookmark-icon'
})

const props = withDefaults(
	defineProps<{
		size: ApplicationSize
		url?: string
		icon?: string
		direction: ApplicationDirection
		shape: ApplicationShape
		mini: boolean
		small: boolean
		medium: boolean
		large: boolean
		huge: boolean
		massive: boolean
		ultra: boolean
		circle: boolean
		rectangle: boolean
		square: boolean
		horizontal: boolean
		vertical: boolean
	}>(),
	{}
)
</script>

<template>
	<div :class="['app-bookmark-icon', size, shape, direction]">
		<Folder class="folder" />
	</div>
</template>

<style lang="scss" scoped>
@use './app-mini.scss' as *;
@use './app-small.scss' as *;
@use './app-medium.scss' as *;
@use './app-large.scss' as *;
@use './app-huge.scss' as *;
@use './app-massive.scss' as *;
@use './app-ultra.scss' as *;

.app-bookmark-icon {
	border-radius: var(--app-round);

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}

	@apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;

	.folder {
		@apply w-full h-full text-[30px] text-[#ffd766];
	}
}
</style>
