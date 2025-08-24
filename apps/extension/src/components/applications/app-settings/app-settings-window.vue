<script setup lang="ts">
import { resize } from '@desktop-app/core'
import { useDraggable } from '@vueuse/core'
import SettingDirection from './setting-direction.vue'
import SettingShape from './setting-shape.vue'
import SettingSize from './setting-size.vue'

defineOptions({
	directives: {
		resize
	},
	name: 'app-settings-window'
})

// const props = withDefaults(defineProps<{}>(), {})
const emits = defineEmits<{
	(e: 'update:transform', value: string): void
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
const settingRect = ref<Omit<DOMRectReadOnly, 'toJSON'>>({
	width: 0,
	height: 0,
	x: 0,
	y: 0,
	top: 0,
	left: 0,
	right: 0,
	bottom: 0
})

watch([x, y], function () {
	if (!draggable.value) {
		beginX.value = x.value
		beginY.value = y.value
		const bodyRect = document.body.getBoundingClientRect()
		dragableRect.value.right = bodyRect.width - settingRect.value.width
		dragableRect.value.bottom = bodyRect.height - settingRect.value.height
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
	<div v-resize="updateResize" class="app-settings-window">
		<div ref="draggableRef" class="settings-header">
			<h2>应用设置</h2>
		</div>
		<a-tabs tab-position="left" v-model:activeKey="activeKey" class="app-settings-tabs">
			<a-tab-pane v-for="option in options" :key="option.value" :tab="option.label">
				<component :is="option.component" />
			</a-tab-pane>
		</a-tabs>
	</div>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.app-settings-window {
	width: 100%;
	height: 100%;
	position: relative;

	$height: 64px;

	&::before {
		content: '';
		position: absolute;
		right: 0;
		bottom: 0;
		width: 10px;
		height: 10px;
		cursor: se-resize;
	}

	.settings-header {
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
