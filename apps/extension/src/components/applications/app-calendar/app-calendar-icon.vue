<script setup lang="ts">
import { timeSphere } from '@desktop-app/core'
import type { Dayjs } from 'dayjs'

defineOptions({
	name: 'app-calendar-icon'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const value = ref<Dayjs>(timeSphere.now())
</script>

<template>
	<div class="app-calendar-icon">
		<a-calendar
			:fullscreen="false"
			v-model:value="value"
			:header-render="() => ''"
			:disabled-date="undefined"
		>
		</a-calendar>
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

.app-calendar-icon {
	border-radius: var(--app-round);
	background: var(--app-background);

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
}
</style>
