<script setup lang="ts">
defineOptions({
	name: 'calendar-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="calendar-overlay"></div>
</template>

<style lang="scss" scoped>
.calendar-overlay {
	width: 100%;
	height: 100%;
}
</style>
