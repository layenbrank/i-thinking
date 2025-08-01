<script setup lang="ts">
import { matrix, Matrix } from 'mathjs'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

defineOptions({
	name: 'math-view'
})

gsap.registerPlugin(Draggable, ScrollTrigger, ScrollSmoother)

// 接口定义
interface AppItem {
	id: number
	name: string
	icon: string
	gridX: number
	gridY: number
	width: number // 网格宽度占比
	height: number // 网格高度占比
	isDragging?: boolean
}

interface GridConfig {
	rows: number
	cols: number
	cellWidth: number
	cellHeight: number
	gap: number
}

// 组件引用
const appControllerRef = useTemplateRef('appControllerRef')

// 响应式数据
const draggables = ref<Draggable[]>([])
const gridMatrix = ref<Matrix>()
const gridConfig = ref<GridConfig>({
	rows: 10,
	cols: 10,
	cellWidth: 60,
	cellHeight: 60,
	gap: 30
})

const applications = ref<AppItem[]>(
	Array.from({ length: 20 }, (_, i) => ({
		id: i,
		name: `应用${i + 1}`,
		icon: '',
		gridX: -1,
		gridY: -1,
		width: 1,
		height: 1
	}))
)

// 矩阵管理类
class GridMatrixManager {
	private matrix: Matrix
	private config: GridConfig

	constructor(config: GridConfig) {
		this.config = config
		this.matrix = matrix(
			Array(config.rows)
				.fill(null)
				.map(() => Array(config.cols).fill(0))
		)
	}

	// 检查位置是否可用
	isPositionAvailable(
		x: number,
		y: number,
		width: number,
		height: number,
		excludeId?: number
	): boolean {
		if (x < 0 || y < 0 || x + width > this.config.cols || y + height > this.config.rows) {
			return false
		}

		for (let row = y; row < y + height; row++) {
			for (let col = x; col < x + width; col++) {
				const cellValue = this.matrix.get([row, col]) as number
				if (cellValue !== 0 && cellValue !== excludeId) {
					return false
				}
			}
		}
		return true
	}

	// 占用位置
	occupyPosition(id: number, x: number, y: number, width: number, height: number): void {
		for (let row = y; row < y + height; row++) {
			for (let col = x; col < x + width; col++) {
				this.matrix.set([row, col], id)
			}
		}
	}

	// 释放位置
	releasePosition(id: number): void {
		const matrixArray = this.matrix.toArray() as number[][]
		for (let row = 0; row < this.config.rows; row++) {
			for (let col = 0; col < this.config.cols; col++) {
				if (matrixArray[row][col] === id) {
					this.matrix.set([row, col], 0)
				}
			}
		}
	}

	// 寻找最近的可用位置
	findNearestAvailablePosition(
		targetX: number,
		targetY: number,
		width: number,
		height: number,
		excludeId?: number
	): { x: number; y: number } | null {
		const maxDistance = Math.max(this.config.rows, this.config.cols)

		for (let distance = 0; distance <= maxDistance; distance++) {
			// 检查当前距离的所有位置
			for (let dy = -distance; dy <= distance; dy++) {
				for (let dx = -distance; dx <= distance; dx++) {
					// 只检查距离边界上的点
					if (Math.abs(dx) !== distance && Math.abs(dy) !== distance) continue

					const x = targetX + dx
					const y = targetY + dy

					if (this.isPositionAvailable(x, y, width, height, excludeId)) {
						return { x, y }
					}
				}
			}
		}
		return null
	}

	// 寻找下一个可用位置（从左到右，从上到下）
	findNextAvailablePosition(width: number, height: number): { x: number; y: number } | null {
		for (let row = 0; row <= this.config.rows - height; row++) {
			for (let col = 0; col <= this.config.cols - width; col++) {
				if (this.isPositionAvailable(col, row, width, height)) {
					return { x: col, y: row }
				}
			}
		}
		return null
	}

	// 自动排列所有元素（分为两部分）
	autoArrange(items: AppItem[]): { left: AppItem[]; right: AppItem[] } {
		// 清空矩阵
		this.matrix = matrix(
			Array(this.config.rows)
				.fill(null)
				.map(() => Array(this.config.cols).fill(0))
		)

		const midCol = Math.floor(this.config.cols / 2)
		const leftItems: AppItem[] = []
		const rightItems: AppItem[] = []

		// 分为两部分
		const halfCount = Math.ceil(items.length / 2)
		const leftPart = items.slice(0, halfCount)
		const rightPart = items.slice(halfCount)

		// 排列左侧
		let leftRow = 0,
			leftCol = 0
		for (const item of leftPart) {
			while (
				leftCol + item.width > midCol ||
				!this.isPositionAvailable(leftCol, leftRow, item.width, item.height)
			) {
				leftCol = 0
				leftRow++
				if (leftRow >= this.config.rows) break
			}

			if (leftRow < this.config.rows) {
				item.gridX = leftCol
				item.gridY = leftRow
				this.occupyPosition(item.id, leftCol, leftRow, item.width, item.height)
				leftItems.push(item)
				leftCol += item.width
			}
		}

		// 排列右侧
		let rightRow = 0,
			rightCol = midCol
		for (const item of rightPart) {
			while (
				rightCol + item.width > this.config.cols ||
				!this.isPositionAvailable(rightCol, rightRow, item.width, item.height)
			) {
				rightCol = midCol
				rightRow++
				if (rightRow >= this.config.rows) break
			}

			if (rightRow < this.config.rows) {
				item.gridX = rightCol
				item.gridY = rightRow
				this.occupyPosition(item.id, rightCol, rightRow, item.width, item.height)
				rightItems.push(item)
				rightCol += item.width
			}
		}

		return { left: leftItems, right: rightItems }
	}

	// 获取矩阵状态（用于调试）
	getMatrixState(): number[][] {
		return this.matrix.toArray() as number[][]
	}
}

// 创建矩阵管理器
const matrixManager = new GridMatrixManager(gridConfig.value)

// 工具函数
const pixelToGrid = (pixelX: number, pixelY: number): { x: number; y: number } => {
	const { cellWidth, cellHeight, gap } = gridConfig.value
	const x = Math.round(pixelX / (cellWidth + gap))
	const y = Math.round(pixelY / (cellHeight + gap))
	return { x, y }
}

const gridToPixel = (gridX: number, gridY: number): { x: number; y: number } => {
	const { cellWidth, cellHeight, gap } = gridConfig.value
	const x = gridX * (cellWidth + gap)
	const y = gridY * (cellHeight + gap)
	return { x, y }
}

// 更新应用位置
const updateAppPosition = (app: AppItem) => {
	const { x, y } = gridToPixel(app.gridX, app.gridY)
	const element = document.querySelector(`[data-app-id="${app.id}"]`) as HTMLElement
	if (element) {
		gsap.set(element, { x, y })
	}
}

// 寻找并移动到可用位置
const moveToAvailablePosition = (app: AppItem, targetX?: number, targetY?: number) => {
	let position: { x: number; y: number } | null = null

	if (targetX !== undefined && targetY !== undefined) {
		// 寻找最近的可用位置
		position = matrixManager.findNearestAvailablePosition(
			targetX,
			targetY,
			app.width,
			app.height,
			app.id
		)
	} else {
		// 寻找下一个可用位置
		position = matrixManager.findNextAvailablePosition(app.width, app.height)
	}

	if (position) {
		// 释放原位置
		if (app.gridX >= 0 && app.gridY >= 0) {
			matrixManager.releasePosition(app.id)
		}

		// 占用新位置
		app.gridX = position.x
		app.gridY = position.y
		matrixManager.occupyPosition(app.id, position.x, position.y, app.width, app.height)

		// 更新视觉位置
		updateAppPosition(app)
	}
}

// 自动排列所有应用
const autoArrangeApps = () => {
	const result = matrixManager.autoArrange(applications.value)

	// 更新所有应用的视觉位置
	applications.value.forEach((app) => {
		updateAppPosition(app)
	})

	console.log('排列结果:', result)
	console.log('矩阵状态:', matrixManager.getMatrixState())
}

// 为应用寻找下一个可用位置
const findNextPositionForApp = (appId: number) => {
	const app = applications.value.find((a) => a.id === appId)
	if (app) {
		moveToAvailablePosition(app)
	}
}

// 组件挂载
onMounted(function () {
	if (!appControllerRef.value) return

	const childNodes = Array.from(appControllerRef.value.childNodes) as HTMLElement[]
	const nodes: HTMLElement[] = []

	for (const node of childNodes) {
		if (node.nodeType !== Node.ELEMENT_NODE) continue
		nodes.push(node as HTMLElement)
	}

	// 初始自动排列
	autoArrangeApps()

	// 创建拖拽实例
	const draggableInstances = Draggable.create(nodes, {
		type: 'x,y',
		bounds: appControllerRef.value,
		inertia: true,

		onDragStart: function () {
			const appId = parseInt(this.target.dataset.appId)
			const app = applications.value.find((a) => a.id === appId)
			if (app) {
				app.isDragging = true
				// 临时释放位置
				matrixManager.releasePosition(appId)
			}
		},

		onDrag: function () {
			// 实时显示预览位置（可选）
		},

		onDragEnd: function () {
			const appId = parseInt(this.target.dataset.appId)
			const app = applications.value.find((a) => a.id === appId)

			if (app) {
				app.isDragging = false

				// 获取当前位置并转换为网格坐标
				const rect = this.target.getBoundingClientRect()
				const containerRect = appControllerRef.value!.getBoundingClientRect()
				const relativeX = rect.left - containerRect.left
				const relativeY = rect.top - containerRect.top

				const gridPos = pixelToGrid(relativeX, relativeY)

				// 寻找最近的可用位置
				moveToAvailablePosition(app, gridPos.x, gridPos.y)
			}
		}
	})

	draggables.value = draggableInstances
})

// 暴露方法供外部调用
defineExpose({
	autoArrangeApps,
	findNextPositionForApp,
	getMatrixState: () => matrixManager.getMatrixState()
})
</script>

<template>
	<div class="math-view">
		<!-- 控制面板 -->
		<div class="control-panel">
			<button @click="autoArrangeApps" class="btn">自动排列</button>
			<button @click="findNextPositionForApp(0)" class="btn">为应用1寻找位置</button>
			<button @click="console.log(matrixManager.getMatrixState())" class="btn">查看矩阵状态</button>
		</div>

		<!-- 应用网格容器 -->
		<div ref="appControllerRef" class="app-controller">
			<div
				v-for="app in applications"
				:key="app.id"
				:data-app-id="app.id"
				class="app-item"
				:class="{ dragging: app.isDragging }"
				:style="{
					width: `${app.width * (gridConfig.cellWidth + gridConfig.gap) - gridConfig.gap}px`,
					height: `${app.height * (gridConfig.cellHeight + gridConfig.gap) - gridConfig.gap}px`
				}"
			>
				<div class="app-item-icon">
					<img :src="app.icon" alt="app-icon" />
				</div>
				<div class="app-item-name">{{ app.name }}</div>
				<div class="app-item-info">{{ app.gridX }},{{ app.gridY }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.math-view {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 20px;

	.control-panel {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;

		.btn {
			padding: 8px 16px;
			background: #007bff;
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 14px;

			&:hover {
				background: #0056b3;
			}
		}
	}

	.app-controller {
		position: relative;
		flex: 1;
		width: 100%;
		min-height: 600px;
		background: #f5f5f5;
		border-radius: 8px;
		padding: 20px;
	}

	.app-item {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		cursor: grab;
		transition:
			transform 200ms ease,
			box-shadow 200ms ease;
		user-select: none;

		&:hover {
			transform: scale(1.05);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		}

		&.dragging {
			z-index: 1000;
			cursor: grabbing;
			transform: scale(1.1);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		}
	}

	.app-item-icon {
		width: 32px;
		height: 32px;
		background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			border-radius: 6px;
		}
	}

	.app-item-name {
		font-size: 12px;
		font-weight: 500;
		color: #333;
		text-align: center;
	}

	.app-item-info {
		font-size: 10px;
		color: #666;
		text-align: center;
	}
}
</style>
