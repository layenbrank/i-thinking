<script setup lang="ts">
import FlipClock from '@/components/applications/clock/flip-clock.vue'

defineOptions({
	name: 'clock-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="clock-overlay">
		<flip-clock></flip-clock>
	</div>
</template>

<style lang="scss" scoped>
.clock-overlay {
	width: 100%;
	height: 100%;

	.flip-clock {
		width: 100%;
		height: 100%;
	}
}
</style>
