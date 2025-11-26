<script setup lang="ts">
defineOptions({
	name: 'clock-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="clock-overlay"></div>
</template>

<style lang="scss" scoped>
.clock-overlay {
	width: 100%;
	height: 100%;
}
</style>
