<script setup lang="ts">
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import d3, { type Selection } from 'd3'
import { v4 as uuid } from 'uuid'

defineOptions({
	name: 'markdown-drawing'
})

const props = withDefaults(defineProps<NodeViewProps>(), {})

const canvasRef = useTemplateRef('canvasRef')

const color = ref(
	getRandomElement(['#A975FF', '#FB5151', '#FD9170', '#FFCB6B', '#68CEF8', '#80CBC4', '#9DEF8F'])
)
const size = ref(Math.ceil(Math.random() * Math.floor(10)))
const svg = ref<Selection<SVGSVGElement | null, unknown, null, undefined> | null>(null)
const path = ref<Selection<SVGPathElement, number[][], null, undefined>>()
const points = ref<number[][]>([])
const drawing = ref(false)
const id = ref<string>(uuid())

function getRandomElement(list: string[]) {
	return list[Math.floor(Math.random() * list.length)]
}

function onStartDrawing(event: MouseEvent | TouchEvent) {
	drawing.value = true
	points.value = []
	if (!svg.value) return
	path.value = svg.value
		.append('path')
		.data([points.value])
		.attr('id', `id-${id.value}`)
		.attr('stroke', color.value ?? [])
		.attr('stroke-width', size.value)

	const moveEvent = event.type === 'mousedown' ? 'mousemove' : 'touchmove'

	svg.value.on(moveEvent, onMove)
}

function onMove(event: MouseEvent | TouchEvent) {
	event.preventDefault()
	const [pointer] = d3.pointers(event)
	if (!pointer) return
	points.value.push(pointer)
	tick()
}

function onEndDrawing() {
	svg.value?.on('mousemove', null)
	svg.value?.on('touchmove', null)

	if (!drawing.value) return

	drawing.value = false
	svg.value?.select(`#id-${id.value}`).remove()
	id.value = uuid()
}

function tick() {
	requestAnimationFrame(function () {
		path.value?.attr('d', function (points) {
			const path = d3.line().curve(d3.curveBasis)([points])
			const lines = props.node.attrs.lines.filter((item) => item.id !== id.value)

			props.updateAttributes({
				lines: [
					...lines,
					{
						id: id.value,
						color: color.value,
						size: size.value,
						path: path
					}
				]
			})

			return path
		})
	})
}

function clear() {
	props.updateAttributes({
		lines: []
	})
}

onMounted(function () {
	svg.value = d3.select(canvasRef.value)

	svg.value
		.on('mousedown', onStartDrawing)
		.on('mouseup', onEndDrawing)
		.on('mouseleave', onEndDrawing)
		.on('touchstart', onStartDrawing)
		.on('touchend', onEndDrawing)
		.on('touchleave', onEndDrawing)
})
</script>

<template>
	<node-view-wrapper class="draw">
		<div class="control-group">
			<div class="button-group">
				<input type="color" v-model="color" />
				<input type="number" min="1" max="10" v-model="size" />
				<button @click="clear">Clear</button>
			</div>
			<svg viewBox="0 0 500 250" ref="canvasRef">
				<template v-for="item in node.attrs.lines">
					<path
						v-if="item.id !== id"
						:key="item.id"
						:d="item.path"
						:id="`id-${item.id}`"
						:stroke="item.color"
						:stroke-width="item.size"
					></path>
				</template>
			</svg>
		</div>
	</node-view-wrapper>
</template>

<style lang="scss" scoped></style>
