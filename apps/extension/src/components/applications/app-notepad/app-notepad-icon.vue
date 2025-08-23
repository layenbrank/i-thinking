<script setup lang="ts">
defineOptions({
	name: 'app-notepad-icon'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="app-notepad-icon">test</div>
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
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--app-round);
	background: var(--app-background);

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
}
</style>
