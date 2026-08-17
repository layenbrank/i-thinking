import { Icon } from '@iconify/react/offline'
import { Button, Space, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { useContext, type ReactNode } from 'react'

import { OverlayContext } from '@/features/magnetic-tile/overlay'
import styles from '@/features/magnetic-tile/caption.module.scss'

interface CaptionProps {
  className?: string
  /** 是否显示最大化/恢复键；默认 true（false 时仅保留关闭键） */
  expandable?: boolean
  /** 顶栏左侧主区域（标题、筛选、视图切换等） */
  start?: ReactNode
  /** 应用扩展操作，渲染在窗口控制键左侧（靠右） */
  actions?: ReactNode
}

function Caption(props: CaptionProps) {
  const { expandable = true } = props
  const { fullscreen, onUpdateFullscreen, onUpdateVisible } = useContext(OverlayContext)

  function close() {
    onUpdateVisible(false)
  }

  return (
    <div
      data-region="false"
      className={clsx(styles.caption, props.className)}>
      {props.start ? <div className={styles.start}>{props.start}</div> : null}
      <div className={styles.end}>
        {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
        <Space.Compact
          orientation="horizontal"
          className={styles.cluster}>
          {expandable ? (
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
                    icon={
                      fullscreen ? 'ant-design:switcher-outlined' : 'ant-design:border-outlined'
                    }
                    width={14}
                    height={14}
                  />
                }
              />
            </Tooltip>
          ) : null}
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
    </div>
  )
}

export type { CaptionProps }
export { Caption }
