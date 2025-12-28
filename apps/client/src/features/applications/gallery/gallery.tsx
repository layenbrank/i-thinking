import { Application, type ProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/gallery/gallery.module.scss'
import Marker from '@/features/applications/gallery/marker.tsx'
import Overlay from '@/features/applications/gallery/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Gallery(props: ProviderProps) {
  const [visible, onUpdateVisible] = useState(false)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application
      onTrash={onTrash}
      {...props}
      className={clsx(styles.gallery)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        onDoubleClick={() => onUpdateVisible(true)}
      />
      <Overlay
        visible={visible}
        onUpdateVisible={onUpdateVisible}
      />
    </Application>
  )
}
