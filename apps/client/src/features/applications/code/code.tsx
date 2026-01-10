import clsx from 'clsx'
import type { MouseEvent } from 'react'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/code/code.module.scss'
import Marker from '@/features/applications/code/marker.tsx'
import Overlay from '@/features/applications/code/overlay.tsx'

export default function Code(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.code)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
      />
      <Overlay />
    </Application.Section>
  )
}
