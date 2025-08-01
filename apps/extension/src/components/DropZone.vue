<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface DroppedItem {
	id: string
	name: string
	type: string
	icon: string
	droppedAt: string
}

interface Props {
	items: DroppedItem[]
}

interface Emits {
	(e: 'drop'): void
	(e: 'clear'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dropZoneRef = ref<HTMLElement | null>(null)

// 处理自定义 drop 事件
function handleCustomDrop(e: Event) {
	e.stopPropagation()
	const customEvent = e as CustomEvent
	console.log('📦 DropZone 接收到 custom-drop 事件:', customEvent.detail)

	// 获取拖拽数据
	const dragData = customEvent.detail.dragData
	if (dragData && dragData.size() > 0) {
		// emit('drop')
	}
}

onMounted(() => {
	if (dropZoneRef.value) {
		// 只监听自定义 drop 事件
		dropZoneRef.value.addEventListener('custom-drop', handleCustomDrop as EventListener)
	}
})

onUnmounted(() => {
	if (dropZoneRef.value) {
		dropZoneRef.value.removeEventListener('custom-drop', handleCustomDrop as EventListener)
	}
})
</script>

<template>
	<div ref="dropZoneRef" class="drop-zone">
		<h3>🎯 放置区域</h3>

		<div class="drop-hint" v-if="items.length === 0">将项目拖拽到这里</div>

		<div class="dropped-items" v-else>
			<div class="item-count">已接收 {{ items.length }} 个项目</div>
			<div v-for="item in items" :key="item.id" class="dropped-item">
				<span class="icon">{{ item.icon }}</span>
				<span class="name">{{ item.name }}</span>
				<span class="time">{{ item.droppedAt }}</span>
			</div>
			<button @click="$emit('clear')" class="clear-btn">清空</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.drop-zone {
	background: white;
	border: 2px dashed #dee2e6;
	border-radius: 8px;
	padding: 20px;
	transition: all 0.3s ease;

	&.drag-over {
		border-color: #007bff;
		background: #f8f9ff;
		transform: scale(1.02);
	}

	h3 {
		margin: 0 0 15px 0;
		color: #333;
		text-align: center;
	}
}

.drop-hint {
	text-align: center;
	color: #6c757d;
	font-size: 16px;
	padding: 40px 0;
}

.dropped-items {
	.item-count {
		text-align: center;
		color: #007bff;
		font-weight: 500;
		margin-bottom: 15px;
	}
}

.dropped-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	background: #e3f2fd;
	border-radius: 4px;
	margin-bottom: 8px;

	.icon {
		font-size: 16px;
	}

	.name {
		flex: 1;
		font-size: 14px;
	}

	.time {
		font-size: 12px;
		color: #666;
	}
}

.clear-btn {
	width: 100%;
	padding: 8px;
	background: #dc3545;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	margin-top: 10px;

	&:hover {
		background: #c82333;
	}
}
</style>
