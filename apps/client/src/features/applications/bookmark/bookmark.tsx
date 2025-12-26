import Application, { type ProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/bookmark/bookmark.module.scss'
import Marker from '@/features/applications/bookmark/marker.tsx'
import Overlay from '@/features/applications/bookmark/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { useState } from 'react'

export default function Bookmark(props: ProviderProps) {
  const [visible, onUpdateVisible] = useState(false)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application
      {...props}
      onTrash={onTrash}
      className={clsx(styles.bookmark)}>
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
