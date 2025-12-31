import clsx from 'clsx'
import type { MouseEvent } from 'react'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/settings/settings.module.scss'
import Marker from '@/features/applications/settings/marker.tsx'
import Overlay from '@/features/applications/settings/overlay.tsx'

export default function Settings(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      onTrash={onTrash}
      {...props}
      className={clsx(styles.settings)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      <Overlay />
    </Application.Section>
  )
}
