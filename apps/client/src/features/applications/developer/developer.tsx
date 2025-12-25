import Application, { type ProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/developer/developer.module.scss'
import Marker from '@/features/applications/developer/marker.tsx'
import Overlay from '@/features/applications/developer/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Developer(props: ProviderProps) {
  const [visible, onUpdateVisible] = useState(false)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application
      onTrash={onTrash}
      {...props}
      className={clsx(styles.developer)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        onDoubleClick={() => onUpdateVisible(true)}
      />
      {visible && (
        <Overlay
          visible={visible}
          onUpdateVisible={onUpdateVisible}
        />
      )}
    </Application>
  )
}
