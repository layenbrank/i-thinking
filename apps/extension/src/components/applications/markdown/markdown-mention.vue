<script setup lang="ts">
defineOptions({
	name: 'markdown-mention'
})

const props = withDefaults(
	defineProps<{
		items: string[]
		command: (props: { id: string }) => void
	}>(),
	{
		items: () => []
	}
)

const selectedIndex = ref(0)

function onKeyDown(event: KeyboardEvent): boolean {
	if (event.key === 'ArrowUp') return (upHandler(), true)

	if (event.key === 'ArrowDown') return (downHandler(), true)

	if (event.key === 'Enter') return (enterHandler(), true)

	return false
}

function upHandler() {
	selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

function downHandler() {
	selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

function enterHandler() {
	selectItem(selectedIndex.value)
}

function selectItem(index: number) {
	const item = props.items[index]

	if (item) props.command({ id: item })
}

watch(
	() => props.items,
	() => {
		selectedIndex.value = 0
	}
)
</script>

<template>
	<div @keydown="onKeyDown" class="markdown-mention">
		<template v-if="items.length">
			<button
				:class="{ 'is-selected': index === selectedIndex }"
				v-for="(item, index) in items"
				:key="index"
				@click="selectItem(index)"
			>
				{{ item }}
			</button>
		</template>
		<div class="item" v-else>No result</div>
	</div>
</template>

<style lang="scss" scoped></style>
