<script setup lang="ts">
import { matrix, Matrix } from 'mathjs'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { useStorage } from '@vueuse/core'

defineOptions({
	name: 'math-view'
})

gsap.registerPlugin(Draggable, ScrollTrigger, ScrollSmoother)

// 接口定义
interface AppItem {
	id: number
	name: string
	x: number // Draggable transform x 值
	y: number // Draggable transform y 值
	column: number // 网格列起始位置
	row: number // 网格行起始位置
	iconSize: string // 图标尺寸 (如: 'icon-size-1x2')
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

// 使用 useStorage 进行持久性存储
const applications = useStorage<AppItem[]>(
	'math-view-applications',
	Array.from({ length: 20 }, (_, i) => ({
		id: i,
		name: `应用${i + 1}`,
		x: 0,
		y: 0,
		column: 0,
		row: 0,
		iconSize: 'icon-size-1x2'
	}))
)

// 添加初始化标记
const isInitialized = useStorage('math-view-initialized', false)

// 解析 iconSize 获取行列占比
const parseIconSize = (iconSize: string): { rowSpan: number; colSpan: number } => {
	// 解析格式: icon-size-{row}x{col}
	const match = iconSize.match(/icon-size-(\d+)x(\d+)/)
	if (match) {
		return {
			rowSpan: parseInt(match[1]),
			colSpan: parseInt(match[2])
		}
	}
	return { rowSpan: 1, colSpan: 1 }
}

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
		col: number,
		row: number,
		colSpan: number,
		rowSpan: number,
		excludeId?: number
	): boolean {
		if (
			col < 0 ||
			row < 0 ||
			col + colSpan > this.config.cols ||
			row + rowSpan > this.config.rows
		) {
			return false
		}

		for (let r = row; r < row + rowSpan; r++) {
			for (let c = col; c < col + colSpan; c++) {
				const cellValue = this.matrix.get([r, c]) as number
				if (cellValue !== 0 && cellValue !== excludeId) {
					return false
				}
			}
		}
		return true
	}

	// 占用位置
	occupyPosition(id: number, col: number, row: number, colSpan: number, rowSpan: number): void {
		for (let r = row; r < row + rowSpan; r++) {
			for (let c = col; c < col + colSpan; c++) {
				this.matrix.set([r, c], id)
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
		targetCol: number,
		targetRow: number,
		colSpan: number,
		rowSpan: number,
		excludeId?: number
	): { col: number; row: number } | null {
		const maxDistance = Math.max(this.config.rows, this.config.cols)

		for (let distance = 0; distance <= maxDistance; distance++) {
			// 检查当前距离的所有位置
			for (let dr = -distance; dr <= distance; dr++) {
				for (let dc = -distance; dc <= distance; dc++) {
					// 只检查距离边界上的点
					if (Math.abs(dc) !== distance && Math.abs(dr) !== distance) continue

					const col = targetCol + dc
					const row = targetRow + dr

					if (this.isPositionAvailable(col, row, colSpan, rowSpan, excludeId)) {
						return { col, row }
					}
				}
			}
		}
		return null
	}

	// 寻找下一个可用位置（从左到右，从上到下）
	findNextAvailablePosition(colSpan: number, rowSpan: number): { col: number; row: number } | null {
		for (let row = 0; row <= this.config.rows - rowSpan; row++) {
			for (let col = 0; col <= this.config.cols - colSpan; col++) {
				if (this.isPositionAvailable(col, row, colSpan, rowSpan)) {
					return { col, row }
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
			const { rowSpan, colSpan } = parseIconSize(item.iconSize)
			while (
				leftCol + colSpan > midCol ||
				!this.isPositionAvailable(leftCol, leftRow, colSpan, rowSpan)
			) {
				leftCol = 0
				leftRow++
				if (leftRow >= this.config.rows) break
			}

			if (leftRow < this.config.rows) {
				item.column = leftCol
				item.row = leftRow
				item.x = 0 // 重置transform值
				item.y = 0
				this.occupyPosition(item.id, leftCol, leftRow, colSpan, rowSpan)
				leftItems.push(item)
				leftCol += colSpan
			}
		}

		// 排列右侧
		let rightRow = 0,
			rightCol = midCol
		for (const item of rightPart) {
			const { rowSpan, colSpan } = parseIconSize(item.iconSize)
			while (
				rightCol + colSpan > this.config.cols ||
				!this.isPositionAvailable(rightCol, rightRow, colSpan, rowSpan)
			) {
				rightCol = midCol
				rightRow++
				if (rightRow >= this.config.rows) break
			}

			if (rightRow < this.config.rows) {
				item.column = rightCol
				item.row = rightRow
				item.x = 0 // 重置transform值
				item.y = 0
				this.occupyPosition(item.id, rightCol, rightRow, colSpan, rowSpan)
				rightItems.push(item)
				rightCol += colSpan
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

	// 考虑网格间距的计算：每个网格位置的实际起始点
	// 第n个网格的起始位置 = n * (cellWidth + gap)
	let x = 0
	let y = 0

	// 计算X坐标对应的网格索引
	if (pixelX >= 0) {
		x = Math.floor(pixelX / (cellWidth + gap))
		// 如果位置超过了网格单元格的中心点，则移动到下一个网格
		const remainder = pixelX % (cellWidth + gap)
		if (remainder > cellWidth / 2) {
			x = Math.min(x + 1, gridConfig.value.cols - 1)
		}
	}

	// 计算Y坐标对应的网格索引
	if (pixelY >= 0) {
		y = Math.floor(pixelY / (cellHeight + gap))
		// 如果位置超过了网格单元格的中心点，则移动到下一个网格
		const remainder = pixelY % (cellHeight + gap)
		if (remainder > cellHeight / 2) {
			y = Math.min(y + 1, gridConfig.value.rows - 1)
		}
	}

	// 确保在有效范围内
	x = Math.max(0, Math.min(x, gridConfig.value.cols - 1))
	y = Math.max(0, Math.min(y, gridConfig.value.rows - 1))

	return { x, y }
}

const gridToPixel = (gridX: number, gridY: number): { x: number; y: number } => {
	const { cellWidth, cellHeight, gap } = gridConfig.value
	const x = gridX * (cellWidth + gap)
	const y = gridY * (cellHeight + gap)
	return { x, y }
}

// 寻找并移动到可用位置
const moveToAvailablePosition = (app: AppItem, targetCol?: number, targetRow?: number) => {
	const { rowSpan, colSpan } = parseIconSize(app.iconSize)
	let position: { col: number; row: number } | null = null

	if (targetCol !== undefined && targetRow !== undefined) {
		// 寻找最近的可用位置
		position = matrixManager.findNearestAvailablePosition(
			targetCol,
			targetRow,
			colSpan,
			rowSpan,
			app.id
		)
	} else {
		// 寻找下一个可用位置
		position = matrixManager.findNextAvailablePosition(colSpan, rowSpan)
	}

	if (position) {
		// 释放原位置
		matrixManager.releasePosition(app.id)

		// 占用新位置
		app.column = position.col
		app.row = position.row
		matrixManager.occupyPosition(app.id, position.col, position.row, colSpan, rowSpan)
	}
}

// 计算xy偏移后的新column和row位置
const calculatePositionFromOffset = (app: AppItem): { col: number; row: number } => {
	const { cellWidth, cellHeight, gap } = gridConfig.value
	const currentPixelX = app.column * (cellWidth + gap) + app.x
	const currentPixelY = app.row * (cellHeight + gap) + app.y

	const gridPos = pixelToGrid(currentPixelX, currentPixelY)
	return { col: gridPos.x, row: gridPos.y }
}

// 初始化应用位置（首次加载或重新排列）
const initializeAppPositions = () => {
	if (!isInitialized.value) {
		// 首次加载，自动排列
		autoArrangeApps()
		isInitialized.value = true
	} else {
		// 页面刷新，根据x,y偏移计算新的column,row
		applications.value.forEach((app) => {
			if (app.x !== 0 || app.y !== 0) {
				const newPos = calculatePositionFromOffset(app)
				moveToAvailablePosition(app, newPos.col, newPos.row)
			}
		})
	}
}

// 自动排列所有应用
const autoArrangeApps = () => {
	const result = matrixManager.autoArrange(applications.value)
	console.log('排列结果:', result)
	console.log('矩阵状态:', matrixManager.getMatrixState())
}

// 重置初始化状态（用于测试）
const resetInitialization = () => {
	isInitialized.value = false
	applications.value.forEach((app) => {
		app.column = 0
		app.row = 0
		app.x = 0
		app.y = 0
	})
	initializeAppPositions()
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

	// 初始化位置
	initializeAppPositions()

	// 创建拖拽实例
	const draggableInstances = Draggable.create(nodes, {
		type: 'x,y',
		bounds: appControllerRef.value,
		inertia: true,
		liveSnap: true,
		// snap: {
		//   x(value) {
		//     const { cellWidth, gap } = gridConfig.value
		//     const gridX = Math.round(value / (cellWidth + gap))
		//     return gridX * (cellWidth + gap)
		//   },
		//   y(value) {
		//     const { cellHeight, gap } = gridConfig.value
		//     const gridY = Math.round(value / (cellHeight + gap))
		//     return gridY * (cellHeight + gap)
		//   }
		// },
		snap: {
			x(value) {
				const x = Math.round(value / 90) * 90
				return x
			},
			y(value) {
				const y = Math.round(value / 90) * 90
				return y
			}
		},
		onDragStart: function () {
			const appId = parseInt(this.target.dataset.appId)
			const app = applications.value.find((a) => a.id === appId)
			if (app) {
				app.isDragging = true
				console.log(`开始拖拽 App${app.id}, 当前位置: col=${app.column}, row=${app.row}`)
			}
		},

		onDrag: function () {
			// 拖拽过程中可以显示预览网格位置
		},

		onDragEnd: function () {
			// const appId = parseInt(this.target.dataset.appId)
			// const app = applications.value.find((a) => a.id === appId)
			// if (app) {
			//   app.isDragging = false
			//   // 获取当前的transform值（经过snap处理后的值）
			//   const currentX = gsap.getProperty(this.target, 'x') as number
			//   const currentY = gsap.getProperty(this.target, 'y') as number
			//   // 保存transform值
			//   app.x = currentX
			//   app.y = currentY
			//   // 计算新的网格位置（基于snap后的位置）
			//   const { cellWidth, cellHeight, gap } = gridConfig.value
			//   const newCol = Math.round(currentX / (cellWidth + gap))
			//   const newRow = Math.round(currentY / (cellHeight + gap))
			//   console.log(`拖拽结束 App${app.id}:`, {
			//     transform: { x: currentX, y: currentY },
			//     oldGrid: { col: app.column, row: app.row },
			//     newGrid: { col: newCol, row: newRow },
			//     cellSize: { width: cellWidth, height: cellHeight }
			//   })
			//   // 如果位置发生了变化，寻找可用位置
			//   if (app.column !== newCol || app.row !== newRow) {
			//     moveToAvailablePosition(app, newCol, newRow)
			//   }
			// }
		}
	})

	draggables.value = draggableInstances
})
</script>

<template>
	<div
		:style="{
			'--app-size': '60px',
			'--app-row-gap': '30px',
			'--app-col-gap': '30px',
			'--app-radius': '12px'
		}"
		class="math-view"
	>
		<!-- 控制面板 -->
		<div class="control-panel">
			<button @click="autoArrangeApps" class="btn">自动排列</button>
			<button @click="findNextPositionForApp(0)" class="btn">为应用1寻找位置</button>
			<button @click="resetInitialization" class="btn">重置初始化</button>
			<button @click="console.log(matrixManager.getMatrixState())" class="btn">查看矩阵状态</button>
		</div>

		<!-- 应用网格容器 -->
		<div
			ref="appControllerRef"
			class="app-controller"
			:style="{
				gridTemplateColumns: `repeat(${gridConfig.cols}, ${gridConfig.cellWidth}px)`,
				gridTemplateRows: `repeat(${gridConfig.rows}, ${gridConfig.cellHeight}px)`,
				gap: `${gridConfig.gap}px`
			}"
		>
			<div
				v-for="app in applications"
				:key="app.id"
				:data-app-id="app.id"
				:class="['app-item', app.iconSize, { dragging: app.isDragging }]"
				:style="{
					gridColumn: `${app.column + 1} / span ${parseIconSize(app.iconSize).colSpan}`,
					gridRow: `${app.row + 1} / span ${parseIconSize(app.iconSize).rowSpan}`,
					transform: `translate(${app.x}px, ${app.y}px)`
				}"
			>
				<div class="app-item-icon">
					<!-- 可以添加图标 -->
				</div>
				<div class="app-item-name">{{ app.name }}</div>
				<div class="app-item-info">{{ app.column }},{{ app.row }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.icon-size-1x1 {
	grid-row: span 1;
	grid-column: span 1;
	width: var(--app-size, 60px);
	height: var(--app-size, 60px);
}

.icon-size-1x2 {
	grid-row: span 1;
	grid-column: span 2;
	width: calc(var(--app-size) * 2 + var(--app-col-gap) * 1);
	height: var(--app-size);
}

.icon-size-1x4 {
	grid-row: span 1;
	grid-column: span 4;
	width: calc(var(--app-size) * 4 + var(--app-col-gap) * 3);
	height: var(--app-size);
}

.icon-size-2x1 {
	grid-row: span 2;
	grid-column: span 1;
	width: var(--app-size);
	height: calc(var(--app-size) * 2 + var(--app-row-gap) * 1);
}

.icon-size-2x2 {
	grid-row: span 2;
	grid-column: span 2;
	width: calc(var(--app-size) * 2 + var(--app-col-gap));
	height: calc(var(--app-size) * 2 + var(--app-row-gap));
}

.icon-size-2x4 {
	grid-row: span 2;
	grid-column: span 4;
	width: calc(var(--app-size) * 4 + var(--app-col-gap) * 3);
	height: calc(var(--app-size) * 2 + var(--app-row-gap));
}

.icon-size-4x4 {
	grid-row: span 4;
	grid-column: span 4;
	width: calc(var(--app-size) * 4 + var(--app-col-gap) * 3);
	height: calc(var(--app-size) * 4 + var(--app-row-gap) * 3);
}

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
		display: grid;
		width: fit-content;
		background: #f5f5f5;
		border-radius: 8px;
		padding: 20px;
		margin: 0 auto;
	}

	.app-item {
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
			transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
			box-shadow 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
		user-select: none;
		padding: 8px;

		&:hover {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		}

		&.dragging {
			z-index: 1000;
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
