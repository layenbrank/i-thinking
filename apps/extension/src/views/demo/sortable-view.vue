<script setup lang="ts">
import Sortable from 'sortablejs'

defineOptions({
	name: 'sortable-view'
})

const appControllerRef = useTemplateRef('appControllerRef')

const applications = Array.from({ length: 30 }, function (_, i) {
	return i
})

function handleDrop(e: DragEvent) {
	e.preventDefault()
	const data = e.dataTransfer?.getData('text/html')
	if (!data) return
	const parsed = JSON.parse(data)
	console.log('parsed', parsed)
}

onMounted(function () {
	const appController = appControllerRef.value as HTMLElement

	const childNodes = Array.from(appController.childNodes) as HTMLElement[]

	const nodes: HTMLElement[] = []

	for (const childNode of childNodes) {
		if (childNode.nodeType !== Node.ELEMENT_NODE) continue
		nodes.push(childNode as HTMLElement)
	}

	Sortable.create(appController, {
		sort: false,
		animation: 300,
		forceFallback: true,
		fallbackClass: 'sortable-fallback',
		setData(dataTransfer, draggedElement) {
			dataTransfer.setData(
				'text/html',
				JSON.stringify({
					text: '测试'
				})
			)
		},
		onStart(event) {
			console.log('onStart', event)
		}
	})
})
</script>

<template>
	<div class="sortable-view">
		<div ref="appControllerRef" class="app-controller">
			<div v-for="app in applications" :key="app" class="app-item">{{ app }}</div>
		</div>
		<div
			@dragover.prevent
			@drop="handleDrop"
			class="absolute bottom-0 right-0 size-20 bg-blue-300"
		></div>
	</div>
</template>

<style lang="scss" scoped>
.sortable-view {
	width: 100%;
	height: 100%;
	overflow: hidden scroll;

	.app-controller {
		display: grid;
		row-gap: 30px;
		column-gap: 30px;
		grid-template-rows: repeat(auto-fill, 60px);
		grid-template-columns: repeat(auto-fill, 60px);
	}

	.app-item {
		width: 60px;
		height: 60px;
		background-color: gray;
	}

	.sortable-fallback {
		background-color: red;
	}
}
</style>
