/** @deprecated 磁贴入口；实际开窗走 overlay + screenshot:open */
import { invoke } from '@tauri-apps/api/core'
import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { lazy } from 'react'

import { Application, type SectionProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/screenshot/screenshot.module.scss'
import { useKeyCode } from '@/keycodes/react'

const Marker = lazy(function () {
  return import('@/features/applications/screenshot/marker.tsx')
})

export default function Screenshot(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  async function onScreenshot() {
    try {
      await invoke('screenshot:open')
    } catch (error) {
      console.error('Error opening screenshot overlay:', error)
    }
  }

  useKeyCode('screenshot', async function () {
    await onScreenshot()
    return true
  })

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.screenshot, props.className)}>
      <Marker />
    </Application.Section>
  )
}
