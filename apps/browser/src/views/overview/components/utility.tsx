import { Icon } from '@iconify/react/offline'
import { Button, Layout, Space, App } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useReducer } from 'react'

import styles from '@/views/overview/components/utility.module.scss'

interface Reactive {
  overlay: boolean
  devtools: boolean
}

type Action = {
  type: 'patch'
  payload: Partial<Reactive>
}

const VISIBLE: Reactive = {
  overlay: false,
  devtools: false
}

function visibleReducer(state: Reactive, action: Action): Reactive {
  if (action.type === 'patch') return { ...state, ...action.payload }

  return state
}

export default function Utility() {
  const { message } = App.useApp()
  const [visible, dispatch] = useReducer(visibleReducer, VISIBLE)

  useEffect(function () {
    function handler() {
      void itc.overlay.toRead().then(function ({ visible }) {
        dispatch({
          type: 'patch',
          payload: {
            overlay: visible
          }
        })
      })
    }

    handler()
    window.addEventListener('focus', handler)
    return function () {
      window.removeEventListener('focus', handler)
    }
  }, [])

  async function handleDevtools() {
    try {
      await itc.devtools.toUpdate({
        visible: true
      })
      dispatch({ type: 'patch', payload: { devtools: true } })
      message.success({ content: '开发工具已打开', duration: 1 })
    } catch (error) {
      message.error({ content: '开发工具打开失败', duration: 2 })
      console.error(error)
    }
  }

  async function handleOverlay() {
    const next = !visible.overlay
    try {
      await itc.overlay.toUpdate({ visible: next })
      dispatch({ type: 'patch', payload: { overlay: next } })
      message.success({ content: next ? '浮层已显示' : '浮层已隐藏', duration: 1 })
    } catch (error) {
      message.error({ content: '浮层状态切换失败', duration: 2 })
      console.error(error)
    }
  }

  async function handleReload() {
    try {
      window.location.reload()
      message.success({ content: '重载成功', duration: 1 })
    } catch (error) {
      message.error({ content: '重载失败', duration: 2 })
      console.error(error)
    }
  }

  return (
    <Layout.Header
      data-region="true"
      className={clsx(styles.utility)}>
      <Space.Compact orientation="horizontal">
        <Button
          data-region="false"
          onClick={handleDevtools}
          className={clsx([styles.button])}
          aria-label="打开开发工具"
          title="打开开发工具">
          <Icon icon="ant-design:bug-filled"></Icon>
        </Button>
        <Button
          data-region="false"
          onClick={handleOverlay}
          className={clsx([styles.button])}
          aria-label={visible.overlay ? '隐藏浮层' : '显示浮层'}
          title={visible.overlay ? '隐藏浮层' : '显示浮层'}>
          <Icon icon={visible.overlay ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></Icon>
        </Button>
        <Button
          data-region="false"
          onClick={handleReload}
          className={clsx([styles.button])}
          aria-label="重载页面"
          title="重载页面">
          <Icon icon="ant-design:reload-outlined"></Icon>
        </Button>
      </Space.Compact>
    </Layout.Header>
  )
}
