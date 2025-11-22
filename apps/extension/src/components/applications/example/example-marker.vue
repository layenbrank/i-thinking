<script setup lang="ts">
defineOptions({
	name: 'example-marker'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="example-marker">example</div>
</template>

<style lang="scss" scoped>
@use 'mini.scss' as *;
@use 'small.scss' as *;
@use 'medium.scss' as *;
@use 'large.scss' as *;
@use 'huge.scss' as *;
@use 'massive.scss' as *;
@use 'ultra.scss' as *;

.example-marker {
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
