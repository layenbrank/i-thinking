import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/example/example.module.scss'

const Marker = lazy(function () {
  return import('@/features/applications/example/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/applications/example/overlay.tsx')
})

export default function Example(props: SectionProps) {
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
      className={clsx(styles.example)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
      />
      {isRenderOverlay ? (
        <Suspense fallback={null}>
          <Overlay
            cache={cache}
            onAbort={props.onAbort}
            abortTimeoutMs={props.abortTimeoutMs}
          />
        </Suspense>
      ) : null}
    </Application.Section>
  )
}
