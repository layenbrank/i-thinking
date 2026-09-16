import { Button } from '@i-thinking/design/components/button'
import { Icon } from '@iconify/react/offline'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from '@/components/utility/utility.module.scss'

interface UtilityButtonProps {
  icon: string
  label: string
  onClick: () => void
}

/** 标题栏图标按钮：方形、与标题栏同高，且必须在拖拽区之外（data-region=false） */
function UtilityButton(props: UtilityButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      data-region="false"
      className={clsx(styles.button)}
      onClick={props.onClick}
      aria-label={props.label}
      title={props.label}>
      <Icon icon={props.icon}></Icon>
    </Button>
  )
}

interface UtilityProps {
  /** 本窗口的动作按钮 —— 每个窗口的操作各不相同，故由调用方传入 */
  children?: ReactNode
  className?: string
}

/**
 * 无边框窗口标题栏的通用外壳：整条是拖拽区（`data-region="true"`），
 * 左侧放调用方传入的动作按钮。**组件自身不含任何动作**。
 *
 * 高度取 `env(titlebar-area-height)`（对齐 window 插件的 `titleBarOverlay`），
 * 右侧 padding 给原生窗口控制按钮让位；要换纵向填充高度就在祖先元素上覆写
 * `--utility-height`。
 */
function Utility(props: UtilityProps) {
  return (
    <header
      data-region="true"
      className={clsx(styles.utility, props.className)}>
      <div className={styles.group}>{props.children}</div>
    </header>
  )
}

export { UtilityButton }
export default Utility
