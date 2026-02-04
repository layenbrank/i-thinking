import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { lazy } from 'react'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
const Marker = lazy(function () {
  return import('@/features/applications/screenshot/marker.tsx')
})
import styles from '@/features/applications/screenshot/screenshot.module.scss'

export default function Screenshot(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.screenshot)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
      />
    </Application.Section>
  )
}
