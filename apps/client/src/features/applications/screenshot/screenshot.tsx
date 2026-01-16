import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { lazy } from 'react'

import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import {
  currentMonitor,
  cursorPosition,
  monitorFromPoint,
  PhysicalPosition,
  PhysicalSize,
  primaryMonitor
} from '@tauri-apps/api/window'

import {
  Application,
  type SectionProps
} from '@/features/application/application.tsx'
const Marker = lazy(function () {
  return import('@/features/applications/screenshot/marker.tsx')
})
// import Overlay from '@/features/applications/screenshot/overlay.tsx'
import styles from '@/features/applications/screenshot/screenshot.module.scss'
import { useKeyCode } from '@/keycodes/react'

const host = import.meta.env.DEV ? 'localhost:5173' : 'tauri.localhost'

async function getActiveMonitor() {
  try {
    const cursor = await cursorPosition()
    const byCursor = await monitorFromPoint(cursor.x, cursor.y)
    if (byCursor) return byCursor
  } catch {
    // ignore and fallback
  }

  return (await currentMonitor()) ?? (await primaryMonitor())
}

async function applyOverlayWindowState(win: WebviewWindow) {
  // 某些情况下 fullscreen/maximized 会覆盖手动 setSize / setPosition，所以先退出
  await win.setFullscreen(false).catch(() => {})
  await win.unmaximize().catch(() => {})

  await win.setDecorations(false).catch(() => {})
  await win.setShadow(false).catch(() => {})
  await win.setResizable(false).catch(() => {})
  await win.setAlwaysOnTop(true).catch(() => {})

  const monitor = await getActiveMonitor()
  if (!monitor) return

  await win.setPosition(
    new PhysicalPosition(monitor.position.x, monitor.position.y)
  )
  await win.setSize(new PhysicalSize(monitor.size.width, monitor.size.height))
}

let screenshotWindow: WebviewWindow | null = null
let unlistenMoved: null | (() => void) = null
let unlistenResized: null | (() => void) = null
let enforcing = false

async function ensureOverlayLocked(win: WebviewWindow) {
  if (!unlistenMoved) {
    unlistenMoved = await win.onMoved(() => {
      if (enforcing) return
      enforcing = true
      void applyOverlayWindowState(win).finally(() => {
        setTimeout(() => {
          enforcing = false
        }, 0)
      })
    })
  }

  if (!unlistenResized) {
    unlistenResized = await win.onResized(() => {
      if (enforcing) return
      enforcing = true
      void applyOverlayWindowState(win).finally(() => {
        setTimeout(() => {
          enforcing = false
        }, 0)
      })
    })
  }
}

export default function Screenshot(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  async function onScreenshot() {
    try {
      const existing =
        screenshotWindow ?? (await WebviewWindow.getByLabel('screenshot'))
      if (existing) {
        screenshotWindow = existing
        await ensureOverlayLocked(existing)
        await applyOverlayWindowState(existing)
        await existing.show()
        // Windows 偶发置顶层级不稳定，show 后再 assert 一次
        await existing.setAlwaysOnTop(true).catch(() => {})
        await existing.setFocus()
        return
      }

      // 等截图页真正渲染完成再 show，避免创建瞬间闪现默认边框/背景
      let unlistenReady: null | (() => void) = null
      const readyPromise = listen<{ label?: string }>(
        'screenshot:ready',
        (e) => {
          console.log('Creating screenshot webview')
          if (e.payload?.label && e.payload.label !== 'screenshot') return
          try {
            unlistenReady?.()
          } finally {
            unlistenReady = null
          }
          void (async () => {
            if (!screenshotWindow) return

            await ensureOverlayLocked(screenshotWindow)
            await applyOverlayWindowState(screenshotWindow)
            await screenshotWindow.show()
            await screenshotWindow.setAlwaysOnTop(true).catch(() => {})
            await screenshotWindow.setFocus()
          })()
        }
      ).then((fn) => {
        unlistenReady = fn
      })

      void readyPromise

      screenshotWindow = new WebviewWindow('screenshot', {
        url: `http://${host}/screenshot`,
        theme: 'light',
        shadow: false,
        center: false,
        visible: false,
        resizable: false,
        maximizable: false,
        maximized: false,
        fullscreen: false,
        minimizable: false,
        focus: true,
        focusable: true,
        hiddenTitle: true,
        transparent: true,
        backgroundColor: '#00000000',
        title: 'Screenshot',
        titleBarStyle: 'transparent',
        alwaysOnTop: true,
        skipTaskbar: false,
        decorations: false,
        dragDropEnabled: false
      })

      // void webview.once('tauri://error', function (e) {
      //   unlistenReady?.()
      //   console.error('Failed to create webview:', e)
      // })
    } catch (error) {
      console.error('Error creating screenshot webview:', error)
    }
  }
  console.log('Screenshot rendering')

  useKeyCode('screenshot', async () => {
    await onScreenshot()
    return true
  })

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
