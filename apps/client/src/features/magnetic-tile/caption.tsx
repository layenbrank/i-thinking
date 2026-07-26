import { Icon } from '@iconify/react'
import { Button, Space, Tooltip } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import { OverlayContext } from '@/features/magnetic-tile/overlay-context'
import styles from '@/features/magnetic-tile/caption.module.scss'

interface CaptionProps {
  className?: string
  /** 应用扩展操作，渲染在基础三键左侧 */
  actions?: ReactNode
}

function Caption(props: CaptionProps) {
  const { fullscreen, onUpdateFullscreen, onUpdateVisible } = useContext(OverlayContext)

  function close() {
    onUpdateVisible(false)
  }

  return (
    <div
      data-region="false"
      className={clsx(styles.caption, props.className)}>
      {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
      <Space.Compact
        orientation="horizontal"
        className={styles.cluster}>
        <Tooltip
          title={fullscreen ? '恢复' : '最大化'}
          placement="bottom">
          <Button
            type="text"
            data-region="false"
            aria-label={fullscreen ? '恢复' : '最大化'}
            className={clsx([styles.button, styles.expand])}
            onClick={function () {
              onUpdateFullscreen(!fullscreen)
            }}
            icon={
              <Icon
                icon={fullscreen ? 'ant-design:switcher-outlined' : 'ant-design:border-outlined'}
                width={14}
                height={14}
              />
            }
          />
        </Tooltip>
        <Tooltip
          title="关闭"
          placement="bottomRight">
          <Button
            type="text"
            data-region="false"
            aria-label="关闭"
            className={clsx([
              styles.button,
              styles.close,
              {
                [styles.fullscreen]: fullscreen
              }
            ])}
            onClick={close}
            icon={
              <Icon
                icon="ant-design:close-outlined"
                width={14}
                height={14}
              />
            }
          />
        </Tooltip>
      </Space.Compact>
    </div>
  )
}

export type { CaptionProps }
export { Caption }
