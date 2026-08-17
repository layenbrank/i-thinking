import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties } from 'react'
import { useContext } from 'react'

import type { SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  MagneticTile,
  OverlayContext
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/navigation/navigation.module.scss'

import Marker from '@/features/magnetic-tiles/navigation/marker.tsx'
import Overlay from '@/features/magnetic-tiles/navigation/overlay.tsx'

interface NavigationProps extends Omit<SectionProps, 'children'> {
  style?: CSSProperties
  className?: ClassValue
  onPrevent?: React.MouseEventHandler<HTMLDivElement>
}

export default function Navigation(props: NavigationProps) {
  const { renderable } = useContext(OverlayContext)
  const cache = props.cache ?? 'destroy'
  const isRenderOverlay = renderable

  function onTrash(e: React.MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <MagneticTile.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.navigation)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        mark={props.mark}
        title={props.title}
      />
      {isRenderOverlay ? (
        <Overlay
          cache={cache}
          onAbort={props.onAbort}
          abortTimeoutMs={props.abortTimeoutMs}
        />
      ) : null}
    </MagneticTile.Section>
  )
}
