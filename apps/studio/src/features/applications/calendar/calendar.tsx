import clsx from 'clsx'
import type { MouseEvent } from 'react'

import { lazy, Suspense } from 'react'

import {
  Application,
  OverlayContext,
  type SectionProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/calendar/calendar.module.scss'

const Marker = lazy(function () {
  return import('@/features/applications/calendar/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/applications/calendar/overlay.tsx')
})

export default function Calendar(props: SectionProps) {
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
      className={clsx(styles.calendar)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
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
