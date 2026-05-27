'use client'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import clsx from 'clsx'
import { useMemo, useRef, type ReactNode } from 'react'
import { useKeyPress } from 'react-use'

import { Application, OverlayProvider } from '@/features/application/application.tsx'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { useMirrorStore } from '@/stores/mirror.ts'

const Controller = {
  Mirror({ children }: { children: ReactNode }) {
    // console.log('[Controller.Mirror] render')
    return <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
  },
  Application() {
    const applications = useMirrorStore((state) => state.applications)
    const controller = useRef<HTMLDivElement>(null)
    const size = 'mini'
    const shape = 'rectangle'
    const direction = 'horizontal'
    // 使用 react-use 监听 Control 键状态
    const [Control] = useKeyPress('Control')

    const uniqueKeys = useMemo(
      function () {
        const keys = applications?.map(function (v) {
          return v.id
        })
        console.log('applications', applications)
        return keys ?? []
      },
      [applications]
    )

    const mouseSensor = useSensor(MouseSensor, {
      activationConstraint: {
        delay: 50,
        distance: 10, // 需要移动 10px 才激活拖拽，避免误触
        tolerance: 10
      }
    })

    const keyboardSensor = useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ['Space', 'Enter'],
        cancel: ['Escape'],
        end: ['Space', 'Enter']
      }
    })

    // 设置传感器，用于检测不同类型的拖拽事件
    const sensors = useSensors(mouseSensor, keyboardSensor)

    // 处理拖拽结束事件
    function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event
      if (!over) return
      if (active.id === over.id) return

      // 检查目标是否是放置区域
      const isDropZone = over.id === 'navigation-drop-zone' || over.id === 'collection-drop-zone'

      // 如果目标是放置区域，执行放置逻辑（无论是否按下 Control 键）
      if (isDropZone) {
        const draggedApplication = applications?.find(function (v) {
          return v.id === active.id
        })

        if (draggedApplication) {
          console.log('[Drop Application]', {
            application: draggedApplication,
            target: over.id,
            action: 'drop'
          })

          // 这里可以添加具体的放置逻辑
          // 例如：将应用添加到 navigation 或 collection 的特定位置
          // 暂时只打印日志，后续可以根据需求实现具体逻辑
        }
        return
      }

      // 检查目标是否是排序容器内的其他应用项
      const isSortableItem = uniqueKeys.includes(over.id.toString())

      // 只有在未按下 Control 键时，才允许排序
      if (!Control && isSortableItem) {
        // 未按下 Control 键且目标是排序容器内的其他项，执行排序逻辑
        const oldIndex = applications?.findIndex(function (v) {
          return v.id === active.id
        })
        const newIndex = applications?.findIndex(function (v) {
          return v.id === over.id
        })

        const moved = arrayMove(applications ?? [], oldIndex ?? 0, newIndex ?? 0)

        const updates = moved.map(function (value, index) {
          return {
            ...value,
            index: index
          }
        })
        console.log('[toUpdateApplication] updates', updates)
        useMirrorStore.getState().toUpdateApplications(updates)
      }
      // 如果按下 Control 键且目标是排序容器内的其他项，不执行任何操作（禁用排序）
    }

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}>
        <SortableContext
          items={uniqueKeys}
          strategy={rectSortingStrategy}>
          <div
            ref={controller}
            className={clsx([
              styles[size],
              styles[shape],
              styles[direction],
              styles.controller,
              styles.application
            ])}>
            {applications?.map(function (value) {
              const Component = Reflection[value.component]

              const props = {
                size,
                shape,
                ...value,
                direction
              }

              return (
                <Application.Suspense
                  key={value.id}
                  size={size}
                  shape={shape}
                  direction={direction}>
                  <OverlayProvider>
                    <Component {...props} />
                  </OverlayProvider>
                </Application.Suspense>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    )
  }
}

export default Controller
