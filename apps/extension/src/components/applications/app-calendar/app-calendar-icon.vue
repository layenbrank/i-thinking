<script setup lang="ts">
import { timeSphere } from '@desktop-app/core'
import type { CalendarMode } from 'ant-design-vue/es/calendar/generateCalendar'
import type { Dayjs } from 'dayjs'

defineOptions({
	name: 'app-calendar-icon'
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

const value = ref<Dayjs>(timeSphere.now())

const isDisable = computed(() => !(props.medium && props.rectangle))
</script>

<template>
	<div :class="['app-calendar-icon', size, shape, direction]">
		<a-calendar
			:disabled-date="() => isDisable"
			:header-render="() => ''"
			v-model:value="value"
			:fullscreen="false"
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

	&.circle {
		border-radius: calc(var(--app-size-width) / 2);
	}
}
</style>
