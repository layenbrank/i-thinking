<script setup lang="ts">
import prepare, { chunk } from '@desktop-app/wasm'
defineOptions({
	name: 'wasm-view'
})

onMounted(async function () {
	await prepare()
	// console.log('wasm', greet('wasm-view'))
})

async function handleFile(e: Event) {
	const target = e.target as HTMLInputElement
	if (target.files) {
		const file = target.files[0]
		if (file) {
			const chunkSize = 1024 * 1024 // 1MB
			chunk(file, chunkSize, 3)
			// console.log('File chunks:', chunks, 'arrayBuffer', chunks.arrayBuffer())
		}
	}
}
</script>

<template>
	<div class="wasm-view">
		<input type="file" name="wasm-file" id="wasm-file" @change="handleFile" />
	</div>
</template>

<style lang="scss" scoped></style>
