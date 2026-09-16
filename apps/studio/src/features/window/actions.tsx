import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { UtilityButton } from '@/components/utility'

/**
 * 各窗口共用的宿主动作按钮。
 *
 * 放在 features 而不是 `components/`：`components/` 只收通用组件，
 * 这些按钮绑定了 Studio 宿主的频道。窗口按需挑用，**不再有一个替所有窗口
 * 决定动作集的 Utility**。
 */

/** 打开**调用窗口自己**的 DevTools（频道按 sender 定位，不指向主窗口） */
export function DevtoolsAction() {
  async function handleClick() {
    try {
      await itc.devtools.toUpdate({
        visible: true
      })
      toast.success('开发工具已打开', { duration: 1000 })
    } catch (error) {
      toast.error('开发工具打开失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <UtilityButton
      icon="ant-design:bug-filled"
      label="打开开发工具"
      onClick={handleClick}
    />
  )
}

/** 切换浮层窗口显隐；窗口重新获得焦点时同步真实状态 */
export function OverlayAction() {
  const [overlay, onUpdateOverlay] = useState(false)

  useEffect(function () {
    function syncOverlay() {
      void itc.overlay.toRead().then(function ({ visible }) {
        onUpdateOverlay(visible)
      })
    }

    syncOverlay()
    window.addEventListener('focus', syncOverlay)
    return function () {
      window.removeEventListener('focus', syncOverlay)
    }
  }, [])

  async function handleClick() {
    const next = !overlay
    try {
      await itc.overlay.toUpdate({ visible: next })
      onUpdateOverlay(next)
      toast.success(next ? '浮层已显示' : '浮层已隐藏', { duration: 1000 })
    } catch (error) {
      toast.error('浮层状态切换失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <UtilityButton
      icon={overlay ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
      label={overlay ? '隐藏浮层' : '显示浮层'}
      onClick={handleClick}
    />
  )
}

/** 重载当前窗口；渲染进程自身的行为，不涉及其它窗口 */
export function ReloadAction() {
  async function handleClick() {
    try {
      window.location.reload()
      toast.success('重载成功', { duration: 1000 })
    } catch (error) {
      toast.error('重载失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <UtilityButton
      icon="ant-design:reload-outlined"
      label="重载页面"
      onClick={handleClick}
    />
  )
}
