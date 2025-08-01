<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = withDefaults(
	defineProps<{
		layout?: 'minimal' | 'standard' | 'detailed' | 'calendar'
		use24Hour?: boolean
	}>(),
	{
		layout: 'standard',
		use24Hour: true
	}
)

const now = ref(new Date())

const updateTime = () => {
	now.value = new Date()
}

let timer: number

onMounted(() => {
	updateTime()
	timer = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
	clearInterval(timer)
})

const hours = computed(() => {
	const h = now.value.getHours()
	if (!props.use24Hour) {
		return (h % 12 || 12).toString().padStart(2, '0')
	}
	return h.toString().padStart(2, '0')
})

const minutes = computed(() => {
	return now.value.getMinutes().toString().padStart(2, '0')
})

const seconds = computed(() => {
	return now.value.getSeconds().toString().padStart(2, '0')
})

const timeFormat = computed(() => {
	const time = `${hours.value}:${minutes.value}`
	if (props.layout === 'detailed') {
		return `${time}:${seconds.value}`
	}
	return time
})

const dateFormat = computed(() => {
	return now.value.toLocaleDateString('zh-CN', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
})

const dayFormat = computed(() => {
	return now.value.toLocaleDateString('zh-CN', { weekday: 'long' })
})

const monthFormat = computed(() => {
	return now.value.toLocaleDateString('zh-CN', { month: 'long' })
})

const dayNumber = computed(() => {
	return now.value.getDate()
})
</script>

<template>
	<div class="clock-widget" :class="layout">
		<template v-if="layout === 'minimal'">
			<div class="time">{{ timeFormat }}</div>
		</template>

		<template v-else-if="layout === 'standard'">
			<div class="time">{{ timeFormat }}</div>
			<div class="date">{{ dateFormat }}</div>
		</template>

		<template v-else-if="layout === 'detailed'">
			<div class="time-container">
				<div class="hours">{{ hours }}</div>
				<div class="separator">:</div>
				<div class="minutes">{{ minutes }}</div>
				<div class="seconds">{{ seconds }}</div>
			</div>
			<div class="date">{{ dateFormat }}</div>
			<div class="day">{{ dayFormat }}</div>
		</template>

		<template v-else-if="layout === 'calendar'">
			<div class="calendar-container">
				<div class="month">{{ monthFormat }}</div>
				<div class="day-number">{{ dayNumber }}</div>
				<div class="time">{{ timeFormat }}</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.clock-widget {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	font-family:
		system-ui,
		-apple-system,
		sans-serif;

	&.minimal {
		.time {
			font-size: 3rem;
			font-weight: 200;
		}
	}

	&.standard {
		.time {
			font-size: 2.5rem;
			font-weight: 300;
		}

		.date {
			margin-top: 0.5rem;
			font-size: 1rem;
			opacity: 0.8;
		}
	}

	&.detailed {
		.time-container {
			display: flex;
			align-items: baseline;
			gap: 0.25rem;
		}

		.hours,
		.minutes {
			font-size: 3rem;
			font-weight: 200;
		}

		.separator {
			font-size: 2rem;
			opacity: 0.5;
			margin: 0 0.25rem;
		}

		.seconds {
			font-size: 1.5rem;
			opacity: 0.5;
		}

		.date,
		.day {
			margin-top: 0.5rem;
			font-size: 1rem;
			opacity: 0.8;
		}
	}

	&.calendar {
		.calendar-container {
			text-align: center;
		}

		.month {
			font-size: 1.25rem;
			opacity: 0.8;
		}

		.day-number {
			font-size: 4rem;
			font-weight: 200;
			line-height: 1;
			margin: 0.5rem 0;
		}

		.time {
			font-size: 1.5rem;
			opacity: 0.8;
		}
	}
}
</style>
