import clsx from 'clsx'
import type { MouseEvent } from 'react'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/example/example.module.scss'
import Marker from '@/features/applications/example/marker.tsx'
import Overlay from '@/features/applications/example/overlay.tsx'

export default function Example(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.example)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
      />
      <Overlay />
    </Application.Section>
  )
}
