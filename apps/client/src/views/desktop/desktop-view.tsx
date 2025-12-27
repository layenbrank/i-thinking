import Controller from '@/components/controller/controller.tsx'
import { Layout } from 'antd'
import styles from './desktop.module.scss'
import { useDraggable, DndContext } from '@dnd-kit/core'

function Draggable() {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: 'unique-id'
  })

  return (
    <div ref={setNodeRef}>
      /* Some other content that does not activate dragging */
      <button
        {...listeners}
        {...attributes}>
        Drag handle
      </button>
    </div>
  )
}

export default function DesktopView() {
  return (
    <Layout className={styles['desktop-view']}>
      <Layout.Header className={styles['desktop-header']}> header </Layout.Header>
      <Layout.Content className={styles['desktop-content']}>
        <DndContext>
          <Draggable></Draggable>
        </DndContext>
      </Layout.Content>
      <Layout.Footer className={styles['desktop-footer']}> footer </Layout.Footer>
    </Layout>
  )
}
