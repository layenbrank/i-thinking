import {
  Application,
  type ProviderProps,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/marketplace.module.scss'
import Marker from '@/features/applications/marketplace/marker.tsx'
import Overlay from '@/features/applications/marketplace/overlay.tsx'
import clsx from 'clsx'
import { type MouseEvent, useContext, useEffect } from 'react'

export default function Marketplace(props: ProviderProps) {
  const { visible, mounted } = useContext(OverlayContext)

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  console.log('context ===>', 'visible', visible, 'mounted', mounted)

  return (
    <Application
      {...props}
      onTrash={onTrash}
      className={clsx(styles.marketplace)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      {mounted && <Overlay />}
    </Application>
  )
}
