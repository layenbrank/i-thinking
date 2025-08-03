<script setup lang="ts">
defineOptions({
	name: 'app-settings-icon'
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
	<div :class="['app-settings-icon', size, shape, direction]">test</div>
</template>

<style lang="scss" scoped>
@use './app-mini.scss' as *;
@use './app-small.scss' as *;
@use './app-medium.scss' as *;
@use './app-large.scss' as *;
@use './app-huge.scss' as *;
@use './app-massive.scss' as *;
@use './app-ultra.scss' as *;

.app-settings-icon {
	border-radius: var(--app-round);

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
	@apply bg-white bg-opacity-30 flex items-center justify-center cursor-pointer;
}
</style>
