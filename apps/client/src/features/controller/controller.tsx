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

import { OverlayProvider } from '@/features/application/application.tsx'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { useMirrorStore } from '@/stores/mirror.ts'

const Controller = {
  Mirror({ children }: { children: ReactNode }) {
    return (
      <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
    )
  },
  Application() {
    const store = useMirrorStore()
    const controller = useRef<HTMLDivElement>(null)

    // 使用 react-use 监听 Control 键状态
    const [Control] = useKeyPress('Control')

    const uniqueKeys = useMemo(
      function () {
        const keys = store.applications?.map(function (v) {
          return v.id
        })
        return keys ?? []
      },
      [store.applications]
    )

    const mouseSensor = useSensor(MouseSensor, {
      activationConstraint: {
        tolerance: 10,
        delay: 1000,
        distance: 10 // 需要移动 10px 才激活拖拽，避免误触
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
      const isDropZone =
        over.id === 'navigation-drop-zone' || over.id === 'collection-drop-zone'

      // 如果目标是放置区域，执行放置逻辑（无论是否按下 Control 键）
      if (isDropZone) {
        const draggedApplication = store.applications?.find(function (v) {
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
        const oldIndex = store.applications?.findIndex(function (v) {
          return v.id === active.id
        })
        const newIndex = store.applications?.findIndex(function (v) {
          return v.id === over.id
        })

        const applications = arrayMove(
          store.applications ?? [],
          oldIndex ?? 0,
          newIndex ?? 0
        )

        const updates = applications.map(function (value, index) {
          return {
            ...value,
            index: index
          }
        })
        console.log('[toUpdateApplication] updates', updates)
        store.toUpdateApplications(updates)
      }
      // 如果按下 Control 键且目标是排序容器内的其他项，不执行任何操作（禁用排序）
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
            {store.applications?.map(function (value) {
              const Component = Reflection[value.component]

              const props = {
                size,
                shape,
                ...value,
                direction
              }

              return (
                <OverlayProvider key={value.id}>
                  <Component {...props} />
                </OverlayProvider>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    )
  }
}

export default Controller
