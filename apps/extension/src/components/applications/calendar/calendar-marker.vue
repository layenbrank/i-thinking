<script setup lang="ts">
import { timeSphere } from '@desktop-app/core'
import type { Dayjs } from 'dayjs'

defineOptions({
	name: 'calendar-marker'
})

const props = withDefaults(
	defineProps<{
		size: Application.Size
	}>(),
	{}
)
// const emits = defineEmits<{}>()

const value = ref<Dayjs>(timeSphere.now())
</script>

<template>
	<div class="calendar-marker">
		<a-calendar
			v-if="size !== 'mini'"
			:fullscreen="false"
			v-model:value="value"
			:header-render="() => ''"
			:disabled-date="undefined"
		>
		</a-calendar>
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

.calendar-marker {
	border-radius: var(--application-round);
	background: var(--application-background);

	&.circle {
		border-radius: calc(var(--application-size-width) / 2);
	}
}
</style>
