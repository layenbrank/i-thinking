<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
	name: 'collection-marker'
})
</script>

<template>
	<div class="collection-marker">
		<Icon icon="mdi:folder-multiple" class="marker-collection" />
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

.collection-marker {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--application-round);
	background: var(--application-background);

	&.circle {
		border-radius: calc(var(--application-size-width) / 2);
	}

	.marker-collection {
		width: 100%;
		height: 100%;
	}
}
</style>
