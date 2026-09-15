import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'
import { clsx } from 'clsx'
import { useEffect, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
  const navigate = useNavigate()
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
      toast.success('开发工具已打开', { duration: 1000 })
    } catch (error) {
      toast.error('开发工具打开失败', { duration: 2000 })
      console.error(error)
    }
  }

  async function handleOverlay() {
    const next = !visible.overlay
    try {
      await itc.overlay.toUpdate({ visible: next })
      dispatch({ type: 'patch', payload: { overlay: next } })
      toast.success(next ? '浮层已显示' : '浮层已隐藏', { duration: 1000 })
    } catch (error) {
      toast.error('浮层状态切换失败', { duration: 2000 })
      console.error(error)
    }
  }

  async function handleReload() {
    try {
      window.location.reload()
      toast.success('重载成功', { duration: 1000 })
    } catch (error) {
      toast.error('重载失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <header
      data-region="true"
      className={clsx(styles.utility)}>
      <div className={styles.group}>
        <Button
          variant="ghost"
          size="icon"
          data-region="false"
          onClick={function () {
            void navigate('/chat')
          }}
          className={clsx(styles.button)}
          aria-label="打开对话"
          title="打开对话">
          <Icon icon="mdi:chat-processing-outline"></Icon>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-region="false"
          onClick={handleDevtools}
          className={clsx(styles.button)}
          aria-label="打开开发工具"
          title="打开开发工具">
          <Icon icon="ant-design:bug-filled"></Icon>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-region="false"
          onClick={handleOverlay}
          className={clsx(styles.button)}
          aria-label={visible.overlay ? '隐藏浮层' : '显示浮层'}
          title={visible.overlay ? '隐藏浮层' : '显示浮层'}>
          <Icon icon={visible.overlay ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></Icon>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-region="false"
          onClick={handleReload}
          className={clsx(styles.button)}
          aria-label="重载页面"
          title="重载页面">
          <Icon icon="ant-design:reload-outlined"></Icon>
        </Button>
      </div>
    </header>
  )
}
