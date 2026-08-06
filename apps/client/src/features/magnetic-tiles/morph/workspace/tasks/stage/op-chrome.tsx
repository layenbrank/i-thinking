import { Icon } from '@iconify/react/offline'
import { Button } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from '@/features/magnetic-tiles/morph/workspace/tasks/stage/op-chrome.module.scss'
import { CSSVAR } from '@/themes'

type OpChromeProps = {
  title: string
  meta?: string
  /** 标题前装饰图标（Iconify 名） */
  icon?: string
  actions?: ReactNode
  onBack: () => void
  className?: string
}

function OpChrome(props: OpChromeProps) {
  const { title, meta, icon, actions, onBack, className } = props

  return (
    <header className={clsx(styles.chrome, CSSVAR.KEY, className)}>
      <div className={styles.lead}>
        {icon ? (
          <span
            className={styles.iconWrap}
            aria-hidden>
            <Icon
              icon={icon}
              width={16}
              height={16}
            />
          </span>
        ) : null}
        <h2 className={styles.title}>{title}</h2>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </div>
      <div className={styles.trail}>
        {actions}
        <span
          className={styles.sep}
          aria-hidden
        />
        <Button
          type="text"
          size="small"
          className={styles.back}
          icon={
            <Icon
              icon="ant-design:arrow-left-outlined"
              width={14}
              height={14}
            />
          }
          onClick={onBack}>
          返回编辑
        </Button>
      </div>
    </header>
  )
}

export { OpChrome }
export type { OpChromeProps }
