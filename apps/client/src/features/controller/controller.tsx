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
import { useKeyModifier } from '@reactuses/core'

import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { useMirrorStore, type MagneticTileWrite } from '@/stores/mirror.ts'

interface MirrorProps {
  children: ReactNode
}

const Controller = {
  Mirror(props: MirrorProps) {
    // console.log('[Controller.Mirror] render')
    return <div className={clsx(styles.controller, styles.mirror)}>{props.children}</div>
  },
  MagneticTile() {
    const magneticTiles = useMirrorStore((state) => state.magneticTiles)
    const controllerRef = useRef<HTMLDivElement>(null)
    const size: MagneticTile.Size = 'mini'
    const shape = 'rectangle'
    const direction = 'horizontal'
    // 使用 react-use 监听 Control 键状态
    const control = useKeyModifier('Control')

    const uniqueKeys = useMemo(
      function () {
        const keys = magneticTiles?.map(function (v) {
          return v.id
        })
        console.log('magneticTiles', magneticTiles)
        return keys ?? []
      },
      [magneticTiles]
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
        const draggedMagneticTile = magneticTiles?.find(function (v) {
          return v.id === active.id
        })

        if (draggedMagneticTile) {
          console.log('[Drop MagneticTile]', {
            magneticTile: draggedMagneticTile,
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
      if (!control && isSortableItem) {
        // 未按下 Control 键且目标是排序容器内的其他项，执行排序逻辑
        const oldIndex = magneticTiles?.findIndex(function (v) {
          return v.id === active.id
        })
        const newIndex = magneticTiles?.findIndex(function (v) {
          return v.id === over.id
        })

        const moved = arrayMove(magneticTiles ?? [], oldIndex ?? 0, newIndex ?? 0)

        const updates = moved.map(function (value, index) {
          return {
            ...value,
            index: index
          }
        })
        console.log('[toUpdateMagneticTile] updates', updates)
        useMirrorStore.getState().toUpdateMagneticTiles(updates)
      }
      // 如果按下 Control 键且目标是排序容器内的其他项，不执行任何操作（禁用排序）
    }

    // const mirrorEvent = useCallback(function () {
    // 	if (listen.current) return
    // 	const subscription = onMirrorEvent<{ magneticTiles: MagneticTile[]; count: number }>(
    // 		'MAGNETIC_TILE:SYNCED'
    // 	).subscribe(async function (event) {
    // 		console.log('MAGNETIC_TILE:SYNCED', event.payload.magneticTiles)

    // 		await store.toUpdateMagneticTile(
    // 			event.payload.magneticTiles.map(function (value) {
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

    // 	// 10 minutes update magnetic tile
    // 	const interval = window.setInterval(function () {
    // 		requestAnimationFrame(function () {
    // 			message.success('update magnetic tile')
    // 			store.toUpdateMagneticTile(useMirrorStore.getState().magneticTiles)
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
            ref={controllerRef}
            className={clsx([
              styles[size],
              styles[shape],
              styles[direction],
              styles.controller,
              styles.magneticTile
            ])}>
            {magneticTiles?.map(function (value) {
              const Component = Reflection[value.component]

              return (
                <MagneticTile.Suspense
                  key={value.id}
                  size={size}
                  shape={shape}
                  direction={direction}>
                  <OverlayProvider magneticTileID={value.id}>
                    <Component {...value} />
                  </OverlayProvider>
                </MagneticTile.Suspense>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    )
  }
}

export default Controller
