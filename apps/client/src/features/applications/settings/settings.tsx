import Application, { type ProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/settings/settings.module.scss'
import Marker from '@/features/applications/settings/marker.tsx'
import Overlay from '@/features/applications/settings/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Settings(props: ProviderProps) {
  const [visible, onUpdateVisible] = useState(false)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application
      onTrash={onTrash}
      {...props}
      className={clsx(styles.settings)}>
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
