/**
 * Agent 无边框窗口标题栏：拖拽区 + 最小化/最大化/关闭（对齐 Utility / Caption）
 */
import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from './titlebar.module.scss'
import { useAgentStore } from '@/stores/agent.ts'

interface TitlebarProps {
  className?: string
  actions?: ReactNode
  /** 覆盖 `start` 区的标题；不传则显示当前会话名（设置等子页用得上） */
  title?: string
}

function AgentTitlebar(props: TitlebarProps) {
  const activeSessionID = useAgentStore(function (state) {
    return state.activeSessionID
  })
  const sessions = useAgentStore(function (state) {
    return state.sessions
  })
  const activeSession = sessions.find(function (session) {
    return session.id === activeSessionID
  })
  const title = props.title ?? activeSession?.title

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
        {title ? (
          <>
            <span
              className={styles.divider}
              aria-hidden
            />
            <span className={styles.session}>{title}</span>
          </>
        ) : null}
      </div>
      <div className={styles.end}>
        {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
        <div className={styles.cluster}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  data-region="false"
                  aria-label="最小化"
                  className={styles.button}
                  onClick={function () {
                    void getCurrentWindow().minimize()
                  }}
                />
              }>
              <Icon
                icon="lucide:minus"
                className="size-3.5"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">最小化</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  data-region="false"
                  aria-label="最大化"
                  className={styles.button}
                  onClick={onMaximize}
                />
              }>
              <Icon
                icon="lucide:square"
                className="size-3.5"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">最大化</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  data-region="false"
                  aria-label="关闭"
                  className={clsx(styles.button, styles.close)}
                  onClick={function () {
                    void getCurrentWindow().close()
                  }}
                />
              }>
              <Icon
                icon="lucide:x"
                className="size-3.5"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">关闭</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

export { AgentTitlebar }
export type { TitlebarProps }
