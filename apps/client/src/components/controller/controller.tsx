import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	MouseSensor,
	useSensor,
	useSensors,
	type DragEndEvent
} from '@dnd-kit/core'
import {
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	arrayMove
} from '@dnd-kit/sortable'
import clsx from 'clsx'
import { message } from 'antd'
import { useEffect, useRef, type ReactNode } from 'react'

import styles from '@/components/controller/controller.module.scss'
import { Reflection } from '@/components/controller/reflection.tsx'
import { onMirrorEvent, useMirrorStore } from '@/stores/demo.ts'
import { generateColor } from '@/utils/generate.ts'

const Controller = {
	Mirror({ children }: { children: ReactNode }) {
		return <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
	},
	Application() {
		const store = useMirrorStore()
		const controller = useRef<HTMLDivElement>(null)
		const listen = useRef(false)

		// 设置传感器，用于检测不同类型的拖拽事件
		const sensors = useSensors(
			useSensor(MouseSensor, {
				activationConstraint: {
					tolerance: 100,
					delay: 3000,
					distance: 800 // 需要移动 8px 才激活拖拽，避免误触
				},
				// 阻止在 overlay 内的拖拽激活
				bypassActivationConstraint({ event }) {
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
				coordinateGetter: sortableKeyboardCoordinates,
				keyboardCodes: {
					start: ['Space', 'Enter'],
					cancel: ['Escape'],
					end: ['Space', 'Enter']
				}
			})
		)

		// 处理拖拽结束事件
		function handleDragEnd(event: DragEndEvent) {
			const { active, over } = event
			if (!over) return
			if (active.id === over.id) return

			const oldIndex = store.applications?.findIndex(function (v) {
				return v.id === active.id
			})
			const newIndex = store.applications?.findIndex(function (v) {
				return v.id === over.id
			})

			const applications = arrayMove(store.applications ?? [], oldIndex ?? 0, newIndex ?? 0)

			const updates = applications.map(function (value, index) {
				return {
					...value,
					index: index
				}
			})
			console.log('[toUpdateApplication] updates', updates)
			// store.toUpdateApplication(updates)
			store.toUpdateApplications(updates)
		}

		const size = 'mini'
		const shape = 'rectangle'
		const direction = 'horizontal'

		// const mirrorEvent = useCallback(function () {
		// 	if (listen.current) return
		// 	const subscription = onMirrorEvent<{ applications: Application[]; count: number }>(
		// 		'APPLICATION:SYNCED'
		// 	).subscribe(async function (event) {
		// 		console.log('APPLICATION:SYNCED', event.payload.applications)

		// 		await store.toUpdateApplication(
		// 			event.payload.applications.map(function (value) {
		// 				return {
		// 					id: value.id,
		// 					background: {
		// 						color: generateColor()
		// 					}
		// 				}
		// 			})
		// 		)
		// 		subscription.unsubscribe()
		// 	})

		// 	listen.current = true
		// }, [])

		// useEffect(function () {
		// 	mirrorEvent()

		// 	// 10 minutes update application
		// 	const interval = window.setInterval(function () {
		// 		requestAnimationFrame(function () {
		// 			message.success('update application')
		// 			store.toUpdateApplication(useMirrorStore.getState().applications)
		// 		})
		// 	}, 1000 * 3)

		// 	return function () {
		// 		clearInterval(interval)
		// 	}
		// }, [])

		return (
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext
					items={
						store.applications?.map(function (v) {
							return v.id
						}) ?? []
					}
					strategy={rectSortingStrategy}
				>
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
						{store.applications?.map(function (value) {
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
