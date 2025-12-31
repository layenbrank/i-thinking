import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/bookmark/bookmark.module.scss'
import Marker from '@/features/applications/bookmark/marker.tsx'
import Overlay from '@/features/applications/bookmark/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Bookmark(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.bookmark)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      <Overlay />
    </Application.Section>
  )
}
