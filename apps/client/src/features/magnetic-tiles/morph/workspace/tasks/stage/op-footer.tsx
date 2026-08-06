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

  return (
    <footer className={clsx(styles.footer, CSSVAR.KEY, className)}>
      <div className={styles.fields}>{fields}</div>
      <div className={styles.actions}>
        {hint ? (
          <Tooltip title={hint.length > 40 ? hint : undefined}>
            <span className={styles.hint}>{hint}</span>
          </Tooltip>
        ) : null}
        {extra}
        <Button
          type="primary"
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
    </footer>
  )
}

export { OpFooter }
export type { OpFooterProps }
