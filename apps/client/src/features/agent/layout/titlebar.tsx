/**
 * Agent 无边框窗口标题栏：拖拽区 + 最小化/最大化/关闭（对齐 Utility / Caption）
 */
import { Icon } from '@iconify/react/offline'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Button, Space, Tooltip } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from '@/features/agent/layout/titlebar.module.scss'
import { useIntelligenceStore } from '@/stores/intelligence.ts'

interface TitlebarProps {
  className?: string
  actions?: ReactNode
}

function AgentTitlebar(props: TitlebarProps) {
  const activeSessionID = useIntelligenceStore(function (state) {
    return state.activeSessionID
  })
  const sessions = useIntelligenceStore(function (state) {
    return state.sessions
  })
  const activeSession = sessions.find(function (session) {
    return session.id === activeSessionID
  })

  function onMaximize() {
    void getCurrentWindow().toggleMaximize()
  }

  return (
    <div
      data-region="true"
      onDoubleClick={onMaximize}
      className={clsx(styles.titlebar, props.className)}>
      <div className={styles.start}>
        <span className={styles.brand}>i-thinking</span>
        {activeSession ? (
          <>
            <span
              className={styles.divider}
              aria-hidden
            />
            <span className={styles.session}>{activeSession.title}</span>
          </>
        ) : null}
      </div>
      <div className={styles.end}>
        {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
        <Space.Compact
          orientation="horizontal"
          className={styles.cluster}>
          <Tooltip
            title="最小化"
            placement="bottom">
            <Button
              type="text"
              data-region="false"
              aria-label="最小化"
              className={styles.button}
              onClick={function () {
                void getCurrentWindow().minimize()
              }}
              icon={
                <Icon
                  icon="ant-design:minus-outlined"
                  width={14}
                  height={14}
                />
              }
            />
          </Tooltip>
          <Tooltip
            title="最大化"
            placement="bottom">
            <Button
              type="text"
              data-region="false"
              aria-label="最大化"
              className={styles.button}
              onClick={onMaximize}
              icon={
                <Icon
                  icon="ant-design:border-outlined"
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
              className={clsx(styles.button, styles.close)}
              onClick={function () {
                void getCurrentWindow().close()
              }}
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

export { AgentTitlebar }
export type { TitlebarProps }
