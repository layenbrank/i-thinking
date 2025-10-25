<script setup lang="ts">
import fallback from '@/assets/feedback/fallback.png'

defineOptions({
	name: 'navigation-marker'
})

withDefaults(
	defineProps<{
		icon?: string
	}>(),
	{}
)
</script>

<template>
	<div class="navigation-marker">
		<a-image
			:preview="false"
			:fallback="fallback"
			:src="icon"
			wrapper-class-name="navigation-image"
		>
			<template #placeholder>
				<a-skeleton-image active class="navigation-placeholder" />
			</template>
		</a-image>
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

.navigation-marker {
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

	:deep(.navigation-image) {
		@extend %size-full;
		border-radius: var(--app-round);
	}

	:deep(.navigation-placeholder) {
		@extend %size-full;
		display: block;

		.ant-skeleton-image {
			@extend %size-full;
		}
	}
}
</style>
