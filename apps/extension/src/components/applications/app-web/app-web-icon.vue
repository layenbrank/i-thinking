<script setup lang="ts">
import fallback from '@/assets/feedback/fallback.png'

defineOptions({
	name: 'app-web-icon'
})

withDefaults(
	defineProps<{
		icon?: string
	}>(),
	{}
)
</script>

<template>
	<div class="app-web-icon">
		<a-image :preview="false" :fallback="fallback" :src="icon" wrapper-class-name="app-web-image">
			<template #placeholder>
				<a-skeleton-image active class="app-web-placeholder" />
			</template>
		</a-image>
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

.app-web-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--app-round);
	background: var(--app-background);

	%size-full {
		width: 100%;
		height: 100%;
	}

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}

	:deep(.app-web-image) {
		@extend %size-full;
		border-radius: var(--app-round);
	}

	:deep(.app-web-placeholder) {
		@extend %size-full;
		display: block;

		.ant-skeleton-image {
			@extend %size-full;
		}
	}
}
</style>
