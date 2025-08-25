<script setup lang="ts">
// import {greet} from './pkg/index'
// import * as wasm from './pkg/index_bg.wasm?url'
import init from '@desktop-app/wasm'
defineOptions({
	name: 'wasm-view'
})

onMounted(function () {
	init().then((wasm) => {
		console.log('wasm', wasm.greet())
	})
	// console.log('wasm', greet())
})
</script>

<template>
	<div class="wasm-view">test</div>
</template>

<style lang="scss" scoped></style>
