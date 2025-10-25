<script setup lang="ts">
defineOptions({
	name: 'clipchamp-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="clipchamp-overlay"></div>
</template>

<style lang="scss" scoped>
.clipchamp-overlay {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
