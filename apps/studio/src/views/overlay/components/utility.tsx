import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/primitive/button'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import styles from '@/views/overlay/components/utility.module.scss'

export default function Utility() {
  const [visible, setVisible] = useState(false)

  useEffect(function () {
    function syncVisible() {
      void itc.overlay.toRead().then(function (result) {
        setVisible(result.visible)
      })
    }

    syncVisible()
    window.addEventListener('focus', syncVisible)
    return function () {
      window.removeEventListener('focus', syncVisible)
    }
  }, [])

  async function handleToggleVisible() {
    const next = !visible
    try {
      await itc.overlay.toUpdate({ visible: next })
      setVisible(next)
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
          onClick={handleToggleVisible}
          className={clsx(styles.button)}
          aria-label={visible ? '隐藏浮层' : '显示浮层'}
          title={visible ? '隐藏浮层' : '显示浮层'}>
          <Icon icon={visible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></Icon>
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
