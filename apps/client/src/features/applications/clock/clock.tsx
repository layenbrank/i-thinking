import Application, { type ProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/clock/clock.module.scss'
import Marker from '@/features/applications/clock/marker.tsx'
import Overlay from '@/features/applications/clock/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Clock(props: ProviderProps) {
  const [visible, onUpdateVisible] = useState(false)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application
      onTrash={onTrash}
      {...props}
      className={clsx(styles.clock)}>
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
