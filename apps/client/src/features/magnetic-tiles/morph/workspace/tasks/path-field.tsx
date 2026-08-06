import { Icon } from '@iconify/react/offline'
import { Button, Input } from 'antd'
import { clsx } from 'clsx'

import styles from '@/features/magnetic-tiles/morph/workspace/tasks/path-field.module.scss'

type PathFieldProps = {
  label: string
  value: string
  placeholder: string
  browseLabel?: string
  onBrowse: () => void
  compact?: boolean
}

function PathField(props: PathFieldProps) {
  const { label, value, placeholder, browseLabel = '浏览…', onBrowse, compact } = props

  return (
    <div className={clsx(styles.field, compact && styles.compact)}>
      {compact ? null : <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <Input
          className={styles.input}
          size="middle"
          value={value}
          placeholder={compact ? label || placeholder : placeholder}
          readOnly
          aria-label={label}
        />
        <Button
          className={styles.browse}
          size="middle"
          icon={
            <Icon
              icon="ant-design:folder-open-outlined"
              width={14}
              height={14}
            />
          }
          onClick={onBrowse}>
          {browseLabel}
        </Button>
      </div>
    </div>
  )
}

export { PathField }
export type { PathFieldProps }
