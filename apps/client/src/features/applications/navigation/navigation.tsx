import { message } from 'antd'
import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties, MouseEvent } from 'react'
import { useState } from 'react'

import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

import type { ProviderProps } from '@/features/application/application.tsx'
import Application from '@/features/application/application.tsx'
import Marker from '@/features/applications/navigation/marker.tsx'
import styles from '@/features/applications/navigation/navigation.module.scss'
import Overlay from '@/features/applications/navigation/overlay.tsx'

interface NavigationProps extends Omit<ProviderProps, 'children'> {
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  onPrevent?: React.MouseEventHandler<HTMLDivElement>
}

export default function Navigation(props: NavigationProps) {
  console.log()
  const [visible, onUpdateVisible] = useState(false)

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
        title: '百度',
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
        skipTaskbar: false
      })

      // 监听窗口创建成功事件
      webview.once('tauri://created', async function () {
        console.log('Webview created successfully')
        message.success('Webview created successfully')

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
      webview.once('tauri://error', function (e) {
        message.error(`Failed to create webview: ${JSON.stringify(e)}`)
        console.error('Failed to create webview:', e)
      })
    } catch (error) {
      message.error(`Error: ${error}`)
      console.error('Error creating webview:', error)
    }
  }

  return (
    <Application
      {...props}
      onTrash={onTrash}
      className={clsx(styles.navigation)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        onDoubleClick={props.onPrevent ?? onRedirect}
        // onDoubleClick={() => onUpdateVisible(true)}
      />
      {visible && (
        <Overlay
          visible={visible}
          onUpdateVisible={onUpdateVisible}
        />
      )}
    </Application>
  )
}
