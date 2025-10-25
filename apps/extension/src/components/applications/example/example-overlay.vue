<script setup lang="ts">
defineOptions({
	name: 'example-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="example-overlay"></div>
</template>

<style lang="scss" scoped>
.example-overlay {
	width: 100%;
	height: 100%;
}
</style>
