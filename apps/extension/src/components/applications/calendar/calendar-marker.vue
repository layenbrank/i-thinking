<script setup lang="ts">
import { timeSphere } from '@i-thinking/core'
import type { Dayjs } from 'dayjs'

defineOptions({
	name: 'calendar-marker'
})

const props = withDefaults(
	defineProps<{
		size: Application.Size
		shape: Application.Shape
		direction: Application.Direction
	}>(),
	{}
)
// const emits = defineEmits<{}>()

const now = ref<Dayjs>(timeSphere.now())

const times = computed(function () {
	return now.value
		.format('YYYY-MM-DD')
		.split('-')
		.map(function (value, index) {
			// 超出两位 保留后两位
			return props.size === 'mini' && value.length === 4
				? value.substring(2, 4)
				: value.padStart(2, '0')
		})
})
</script>

<template>
	<div class="calendar-marker">
		<template v-if="size === 'mini' && shape === 'square'">
			{{ timeSphere.format(timeSphere.now(), 'DD') }}
		</template>
		<template v-else-if="size === 'mini' && shape === 'rectangle'">
			<span v-for="value in times" :key="value" class="time-text">
				{{ value }}
			</span>
		</template>
		<a-calendar
			v-if="size !== 'mini'"
			:fullscreen="false"
			v-model:value="now"
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
}
</style>
