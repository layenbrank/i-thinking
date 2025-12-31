import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/marketplace.module.scss'
import Marker from '@/features/applications/marketplace/marker.tsx'
import Overlay from '@/features/applications/marketplace/overlay.tsx'
import clsx from 'clsx'
import { type MouseEvent } from 'react'

export default function Marketplace(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.marketplace)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      <Overlay />
    </Application.Section>
  )
}
