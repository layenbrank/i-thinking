import { Icon } from '@iconify/react/offline'
import { Button, Tooltip } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import styles from '@/features/magnetic-tiles/morph/workspace/tasks/stage/op-footer.module.scss'
import { CSSVAR } from '@/themes'

type OpFooterProps = {
  fields?: ReactNode
  hint?: string
  submitLabel: string
  submitDisabled?: boolean
  submitLoading?: boolean
  onSubmit: () => void
  extra?: ReactNode
  className?: string
}

function OpFooter(props: OpFooterProps) {
  const {
    fields,
    hint,
    submitLabel,
    submitDisabled,
    submitLoading,
    onSubmit,
    extra,
    className
  } = props

  const hasSettings = Boolean(fields)

  return (
    <footer
      className={clsx(
        styles.footer,
        hasSettings && styles.stacked,
        CSSVAR.KEY,
        className
      )}>
      {hasSettings ? <div className={styles.settings}>{fields}</div> : null}
      <div className={styles.actionBar}>
        <div className={styles.actionLead}>{extra}</div>
        <div className={styles.actionTrail}>
          {hint ? (
            <Tooltip title={hint.length > 40 ? hint : undefined}>
              <span className={styles.hint}>{hint}</span>
            </Tooltip>
          ) : null}
          <Button
            type="primary"
            size="middle"
            className={styles.submit}
            loading={submitLoading}
            disabled={submitDisabled}
            icon={
              <Icon
                icon="ant-design:play-circle-outlined"
                width={14}
                height={14}
              />
            }
            onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </footer>
  )
}

export { OpFooter }
export type { OpFooterProps }
