import { Icon } from '@iconify/react/offline'
import { Button } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from '@/features/magnetic-tiles/morph/workspace/tasks/task-shell.module.scss'
import { CSSVAR } from '@/themes'

type TaskShellProps = {
  title: string
  description?: string
  hint?: string
  children: ReactNode
  cancelLabel?: string
  submitLabel: string
  submitDisabled?: boolean
  submitLoading?: boolean
  onCancel: () => void
  onSubmit: () => void
}

function TaskShell(props: TaskShellProps) {
  const {
    title,
    description,
    hint,
    children,
    cancelLabel = '取消',
    submitLabel,
    submitDisabled,
    submitLoading,
    onCancel,
    onSubmit
  } = props

  return (
    <section
      className={clsx(styles.shell, CSSVAR.KEY)}
      role="region"
      aria-label={title}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="关闭任务"
          onClick={onCancel}>
          <Icon
            icon="ant-design:close-outlined"
            width={14}
            height={14}
          />
        </button>
      </header>

      <div className={styles.body}>{children}</div>

      <footer className={styles.footer}>
        <span className={styles.hint}>{hint ?? ''}</span>
        <div className={styles.actions}>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button
            type="primary"
            loading={submitLoading}
            disabled={submitDisabled}
            onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </footer>
    </section>
  )
}

export { TaskShell }
export type { TaskShellProps }
