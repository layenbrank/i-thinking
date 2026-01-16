import { message } from 'antd'
import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties, MouseEvent } from 'react'
import { Suspense, lazy, useContext } from 'react'

import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

import type { SectionProps } from '@/features/application/application.tsx'
import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/navigation/navigation.module.scss'

const Marker = lazy(function () {
  return import('@/features/applications/navigation/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/applications/navigation/overlay.tsx')
})

interface NavigationProps extends Omit<SectionProps, 'children'> {
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  onPrevent?: React.MouseEventHandler<HTMLDivElement>
}

export default function Navigation(props: NavigationProps) {
  const { renderable } = useContext(OverlayContext)
  const cache = props.cache ?? 'destroy'
  const isRenderOverlay = renderable

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  async function onRedirect(e: MouseEvent<HTMLElement>) {
    console.log(
      'Marker double-clicked for',
      e,
      '\nnavigating to URL:',
      props.url,
      'navigation props:',
      props
    )

    try {
      // 检查窗口是否已存在
      const existing = await WebviewWindow.getByLabel('navigation')
      if (existing) {
        // 如果窗口已存在，显示并聚焦
        await existing.show()
        await existing.setFocus()
        return
      }
      if (!props.url) return message.error('URL 未定义，无法打开新窗口')

      // 创建新窗口 - 明确设置所有必要的属性
      const webview = new WebviewWindow('navigation', {
        // url: 'https://www.baidu.com',
        // url: 'https://x.ant.design',
        // url: 'https://cn.bing.com',
        url: props.url,
        width: 1200,
        height: 800,
        title: props.title,
        center: true,
        closable: true,
        resizable: true,
        maximizable: true,
        minimizable: true,
        focus: true,
        focusable: true,
        visible: true,
        decorations: true,
        devtools: true,
        skipTaskbar: false,
        contentProtected: false,
        allowLinkPreview: true
      })

      // 监听窗口创建成功事件
      void webview.once('tauri://created', async function () {
        console.log('Webview created successfully')

        try {
          // 确保窗口显示并聚焦
          await webview.show()
          await webview.setFocus()
          console.log('Window shown and focused, URL should be loading...')
        } catch (err) {
          console.error('Error showing webview:', err)
        }
      })

      // 监听窗口创建错误事件
      void webview.once('tauri://error', function (e) {
        message.error(`Failed to create webview: ${JSON.stringify(e)}`)
        console.error('Failed to create webview:', e)
      })
    } catch (error) {
      message.error(`Error: ${error}`)
      console.error('Error creating webview:', error)
    }
  }

  return (
    <Application.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.navigation)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        onDoubleClick={props.onPrevent ?? onRedirect}
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
