<script setup lang="ts">
import type { SlideAppDirection, SlideAppShape, SlideAppSize } from '@/types/slide-app'

defineOptions({
	name: 'app-notepad-icon'
})

const props = withDefaults(
	defineProps<{
		size: SlideAppSize
		url?: string
		icon?: string
		direction: SlideAppDirection
		shape: SlideAppShape
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
	<div :class="['app-notepad-icon', size, shape, direction]">test</div>
</template>

<style lang="scss" scoped>
@use './app-mini.scss' as *;
@use './app-small.scss' as *;
@use './app-medium.scss' as *;
@use './app-large.scss' as *;
@use './app-huge.scss' as *;
@use './app-massive.scss' as *;
@use './app-ultra.scss' as *;

.app-notepad-icon {
	border-radius: var(--app-round);

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
	@apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;
}
</style>
