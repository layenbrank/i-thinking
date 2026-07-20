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
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useKeyModifier } from '@reactuses/core'

import { Application, OverlayProvider } from '@/features/application/application.tsx'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'

const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'mock-navigation-bing',
    url: 'https://cn.bing.com',
    mark: null,
    title: 'Bing',
    index: 0,
    round: '12px',
    mirrorID: '123',
    textSize: '13px',
    backdrop: null,
    component: 'navigation',
    textColor: '#ffffff',
    description: 'Navigation',
    collectionID: null,
    background: {
      color: '#ffffff'
    },
    updatedAt: 0,
    createdAt: 0,
    downloadCount: 1000
  },
  {
    id: 'mock-navigation-baidu',
    url: 'https://www.baidu.com',
    mark: null,
    title: 'Baidu',
    index: 1,
    round: '12px',
    mirrorID: '123',
    textSize: '13px',
    backdrop: null,
    component: 'navigation',
    textColor: '#ffffff',
    description: 'Navigation',
    collectionID: null,
    background: {
      color: '#ffffff'
    },
    updatedAt: 0,
    createdAt: 0,
    downloadCount: 1000
  }
]

const Controller = {
  Mirror({ children }: { children: ReactNode }) {
    return <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
  },
  Application() {
    const [applications, onUpdateApplications] = useState(MOCK_APPLICATIONS)
    const controller = useRef<HTMLDivElement>(null)
    const size = 'mini'
    const shape = 'rectangle'
    const direction = 'horizontal'
    const control = useKeyModifier('Control')

    const uniqueKeys = useMemo(
      function () {
        return applications.map(function (v) {
          return v.id
        })
      },
      [applications]
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
        const draggedApplication = applications.find(function (v) {
          return v.id === active.id
        })
        if (draggedApplication) {
          console.log('[Drop Application]', {
            application: draggedApplication,
            target: over.id,
            action: 'drop'
          })
        }
        return
      }

      const isSortableItem = uniqueKeys.includes(over.id.toString())

      if (!control && isSortableItem) {
        const oldIndex = applications.findIndex(function (v) {
          return v.id === active.id
        })
        const newIndex = applications.findIndex(function (v) {
          return v.id === over.id
        })
        if (oldIndex < 0 || newIndex < 0) return

        const moved = arrayMove(applications, oldIndex, newIndex)
        const updates = moved.map(function (value, index) {
          return {
            ...value,
            index
          }
        })
        onUpdateApplications(updates)
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
            data-region="false"
            className={clsx([
              styles[size],
              styles[shape],
              styles[direction],
              styles.controller,
              styles.application
            ])}>
            {applications.map(function (value) {
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
