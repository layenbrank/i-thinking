import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/collection/collection.module.scss'

const Marker = lazy(function () {
  return import('@/features/applications/collection/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/applications/collection/overlay.tsx')
})

export default function Collection(props: SectionProps) {
  const { renderable } = useContext(OverlayContext)
  const cache = props.cache ?? 'destroy'
  const isRenderOverlay = renderable

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.collection)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
      />
      {isRenderOverlay ? (
        <Suspense fallback={null}>
          <Overlay
            id={props.id}
            cache={cache}
            onAbort={props.onAbort}
            abortTimeoutMs={props.abortTimeoutMs}
          />
        </Suspense>
      ) : null}
    </Application.Section>
  )
}
