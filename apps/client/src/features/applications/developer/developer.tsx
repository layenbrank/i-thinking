import clsx from 'clsx'
import type { MouseEvent } from 'react'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/developer/developer.module.scss'
import Marker from '@/features/applications/developer/marker.tsx'
import Overlay from '@/features/applications/developer/overlay.tsx'

export default function Developer(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      onTrash={onTrash}
      {...props}
      className={clsx(styles.developer)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      <Overlay />
    </Application.Section>
  )
}
