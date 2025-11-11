<script setup lang="ts">
import { resize } from '@desktop-app/core'
import { Icon } from '@iconify/vue'
import { useDraggable } from '@vueuse/core'
import SettingBackground from './setting-background.vue'
import SettingDirection from './setting-direction.vue'
import SettingShape from './setting-shape.vue'
import SettingSize from './setting-size.vue'

defineOptions({
	directives: {
		resize
	},
	name: 'settings-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
const emits = defineEmits<{
	(e: 'update:transform', value: string): void
	(e: 'update:resize', value: { width: number; height: number }): void
}>()

const draggableRef = useTemplateRef('draggableRef')
const activeKey = ref('size')

const options = [
	{
		label: '大小',
		value: 'size',
		component: SettingSize
	},
	{
		label: '方向',
		value: 'direction',
		component: SettingDirection
	},
	{
		label: '形状',
		value: 'shape',
		component: SettingShape
	},
	{
		label: '背景',
		value: 'background',
		component: SettingBackground
	}
]

const { x, y, isDragging } = useDraggable(draggableRef)

const beginX = ref<number>(0)
const beginY = ref<number>(0)
const draggable = ref(false)
const transformX = ref(0)
const transformY = ref(0)
const preTransformX = ref(0)
const preTransformY = ref(0)
const dragableRect = ref({
	width: 0,
	height: 0,
	x: 0,
	y: 0,
	top: 0,
	left: 0,
	right: 0,
	bottom: 0
})
const settingRect = ref<Omit<DOMRect, 'toJSON'>>({
	width: 0,
	height: 0,
	x: 0,
	y: 0,
	top: 0,
	left: 0,
	right: 0,
	bottom: 0
})

let windowWidth = Number((innerWidth * 0.8).toFixed(2))
let windowHeight = Number(((windowWidth * 9) / 16).toFixed(2))
console.log(`窗口大小: ${windowWidth}x${windowHeight}`)

const resizeHandleRef = useTemplateRef('resizeHandleRef')
let resizing = false
let resizeBeginX = 0
let resizeBeginY = 0
let beginWidth = 0
let beginHeight = 0

function handleResizeBegin(e: MouseEvent) {
	e.preventDefault()
	resizing = true
	resizeBeginX = e.clientX
	resizeBeginY = e.clientY
	beginWidth = windowWidth
	beginHeight = windowHeight
	document.addEventListener('mousemove', handleResizeMove)
	document.addEventListener('mouseup', handleResizeFinal)
}

function handleResizeMove(e: MouseEvent) {
	if (!resizing) return
	const dx = e.clientX - resizeBeginX
	const dy = e.clientY - resizeBeginY
	const prevWidth = windowWidth
	const prevHeight = windowHeight
	windowWidth = Math.max(300, beginWidth + dx)
	windowHeight = Math.max(200, beginHeight + dy)
	// 修正 transform，使窗口中心点不变
	const centerX = transformX.value + prevWidth / 2
	const centerY = transformY.value + prevHeight / 2
	transformX.value = centerX - windowWidth / 2
	transformY.value = centerY - windowHeight / 2
	emits('update:transform', `translate(${transformX.value}px, ${transformY.value}px)`)
	emits('update:resize', { width: windowWidth, height: windowHeight })
}

function handleResizeFinal() {
	resizing = false
	document.removeEventListener('mousemove', handleResizeMove)
	document.removeEventListener('mouseup', handleResizeFinal)
}

onMounted(function () {
	if (!resizeHandleRef.value) return
	resizeHandleRef.value.addEventListener('mousedown', handleResizeBegin)
})

onBeforeUnmount(function () {
	if (resizeHandleRef.value) {
		resizeHandleRef.value.removeEventListener('mousedown', handleResizeBegin)
	}
	document.removeEventListener('mousemove', handleResizeMove)
	document.removeEventListener('mouseup', handleResizeFinal)
})

watch([x, y], function () {
	if (!draggable.value) {
		beginX.value = x.value
		beginY.value = y.value
		const bodyRect = document.body.getBoundingClientRect()
		// dragableRect.value.right = bodyRect.width - settingRect.value.width
		// dragableRect.value.bottom = bodyRect.height - settingRect.value.height
		// // 用最新宽高计算边界
		dragableRect.value.right = bodyRect.width - windowWidth
		dragableRect.value.bottom = bodyRect.height - windowHeight
		preTransformX.value = transformX.value
		preTransformY.value = transformY.value
	}
	draggable.value = true
})

watchEffect(function () {
	if (!draggable.value) return
	transformX.value =
		preTransformX.value +
		Math.min(Math.max(dragableRect.value.left, x.value), dragableRect.value.right) -
		beginX.value
	transformY.value =
		preTransformY.value +
		Math.min(Math.max(dragableRect.value.top, y.value), dragableRect.value.bottom) -
		beginY.value
	emits('update:transform', `translate(${transformX.value}px, ${transformY.value}px)`)
})

watch(isDragging, function () {
	if (isDragging) return
	draggable.value = false
})

function updateResize(DOMRect: DOMRectReadOnly) {
	settingRect.value = DOMRect
}
</script>

<template>
	<div v-resize="updateResize" class="settings-overlay">
		<div ref="draggableRef" class="settings-head bg-gray-300">
			<h2>应用设置</h2>
			<i data-icon="academicons:acclaim-square" size="24" class="iconify size-5"></i>
			<span class="iconify size-5" data-icon="academicons:academia-square"></span>
			<Icon icon="ant-design:align-left-outlined"></Icon>
			<Icon icon="local:close-outlined"></Icon>
		</div>
		<a-tabs tab-position="left" v-model:activeKey="activeKey" class="app-settings-tabs">
			<a-tab-pane v-for="option in options" :key="option.value" :tab="option.label">
				<component :is="option.component" />
			</a-tab-pane>
		</a-tabs>
		<i class="resize-handle" ref="resizeHandleRef"></i>
	</div>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.settings-overlay {
	width: 100%;
	height: 100%;
	position: relative;

	$height: 64px;

	.resize-handle {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 10px;
		height: 10px;
		cursor: se-resize;
	}

	.settings-head {
		height: $height;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0px 1px 0px 0px rgba($color: #000000, $alpha: 0.3);
		cursor: move;
	}

	.app-settings-tabs {
		width: 100%;
		height: calc(100% - $height);
	}
}
</style>
