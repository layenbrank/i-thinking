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
import { useMirrorStore } from '@/stores/mirror.ts'

interface MirrorProps {
  children: ReactNode
}

const Controller = {
  Mirror(props: MirrorProps) {
    return <div className={clsx(styles.controller, styles.mirror)}>{props.children}</div>
  },
  MagneticTile() {
    const magneticTiles = useMirrorStore((state) => state.magneticTiles)
    const controller = useRef<HTMLDivElement>(null)
    const control = useKeyModifier('Control')

    const uniqueKeys = useMemo(
      function () {
        const keys = magneticTiles?.map(function (v) {
          return v.id
        })
        return keys ?? []
      },
      [magneticTiles]
    )

    const mouseSensor = useSensor(MouseSensor, {
      activationConstraint: {
        delay: 50,
        distance: 10,
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

    const sensors = useSensors(mouseSensor, keyboardSensor)

    function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event
      if (!over) return
      if (active.id === over.id) return

      const isDropZone = over.id === 'navigation-drop-zone' || over.id === 'collection-drop-zone'

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
        }
        return
      }

      const isSortableItem = uniqueKeys.includes(over.id.toString())

      if (!control && isSortableItem) {
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
        useMirrorStore.getState().toUpdateMagneticTiles(updates)
      }
    }

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
            className={clsx([styles.controller, styles['magnetic-tile']])}>
            {magneticTiles?.map(function (value) {
              const Component = Reflection[value.component]

              return (
                <MagneticTile.Suspense
                  key={value.id}
                  size={value.size}
                  shape={value.shape}
                  direction={value.direction}>
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
