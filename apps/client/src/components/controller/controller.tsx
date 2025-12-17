import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent
} from '@dnd-kit/core'
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import styles from '@/components/controller/controller.module.scss'
import { Reflection } from '@/components/controller/reflection.tsx'
import { generateColor } from '@/utils/generate.ts'

const Controller = {
	Mirror({ children }: { children: ReactNode }) {
		return <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
	},
	Application() {
		const controller = useRef<HTMLDivElement>(null)

		// 设置传感器，用于检测不同类型的拖拽事件
		const sensors = useSensors(
			useSensor(PointerSensor, {
				activationConstraint: {
					distance: 8 // 需要移动 8px 才激活拖拽，避免误触
				},
				// 阻止在 overlay 内的拖拽激活
				bypassActivationConstraint: ({ event }) => {
					const target = event.target as HTMLElement
					if (!target) return false

					// 检查点击目标是否在 overlay 内
					const isOverlay =
						target.closest('.application-overlay') ||
						target.closest('.ant-modal-wrap') ||
						target.closest('.ant-modal') ||
						target.closest('.ant-modal-content') ||
						target.closest('.ant-modal-body')

					// 如果在 overlay 内，返回 false 应用约束（阻止拖拽）
					// 否则返回 true 绕过约束（允许拖拽）
					return !isOverlay
				}
			}),
			useSensor(KeyboardSensor, {
				coordinateGetter: sortableKeyboardCoordinates
			})
		)

		// 处理拖拽结束事件
		function handleDragEnd(event: DragEndEvent) {
			const { active, over } = event
			if (over && active.id !== over.id) {
				updateApplications((items) => {
					const oldIndex = items.findIndex((item) => item.id === active.id)
					const newIndex = items.findIndex((item) => item.id === over.id)
					return arrayMove(items, oldIndex, newIndex)
				})
			}
		}

		const size = 'mini'
		const shape = 'rectangle'
		const direction = 'horizontal'

		const components: Application.Component[] = [
			'bookmark',
			'calendar',
			'intelligence',
			'navigation',
			'settings',
			'developer',
			'markdown',
			'clipchamp',
			'marketplace',
			'clock',
			'collection',
			'gallery',
			'signboard'
		]

		function matchName(component: Application.Component) {
			if (component === 'bookmark') return '书签'
			if (component === 'calendar') return '日历'
			if (component === 'intelligence') return 'AI'
			if (component === 'navigation') return '导航'
			if (component === 'settings') return '设置'
			if (component === 'developer') return '开发者'
			if (component === 'markdown') return 'Markdown'
			if (component === 'clipchamp') return 'Clipchamp'
			if (component === 'marketplace') return '市场'
			if (component === 'clock') return '时钟'
			if (component === 'collection') return '收藏夹'
			if (component === 'gallery') return '画廊'
			if (component === 'signboard') return '看板'
			return 'unknown'
		}

		const [applications, updateApplications] = useState<Application[]>(
			Array.from({ length: components.length }).map(function (_, i) {
				const title = matchName(components[i])

				return {
					url: null,
					mark: null,
					collectionID: null,
					mirrorID: 'null',
					createdAt: Date.now(),
					updatedAt: Date.now(),
					id: i.toString(),
					component: components[i],
					// component: components[i % components.length],
					round: '12px',
					screenID: '0',
					index: 0,
					title: title,
					backdrop: null,
					background: {
						color: generateColor()
					},
					textSize: '13px',
					textColor: '#ffffff',
					description: title,
					downloadCount: 1000
				}
			})
		)

		useEffect(function () {
			if (!controller.current) return
			console.log('controller', controller.current)

			console.log('applications', applications)
		}, [])

		return (
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={applications.map((item) => item.id)} strategy={rectSortingStrategy}>
					<div
						ref={controller}
						className={clsx([
							styles[size],
							styles[shape],
							styles[direction],
							styles.controller,
							styles.application
						])}
					>
						{applications.map(function (value) {
							const Component = Reflection[value.component]

							const props = {
								...value,
								size,
								shape,
								direction
							}
							return <Component {...props} key={value.id} />
						})}
					</div>
				</SortableContext>
			</DndContext>
		)
	}
}

export default Controller
