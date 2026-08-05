import { Icon } from '@iconify/react/offline'
import { Button, Input, Space } from 'antd'

import styles from '@/features/magnetic-tiles/morph/workspace/tasks/path-field.module.scss'

type PathFieldProps = {
  label: string
  value: string
  placeholder: string
  browseLabel?: string
  onBrowse: () => void
}

function PathField(props: PathFieldProps) {
  const { label, value, placeholder, browseLabel = '浏览…', onBrowse } = props

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <Space.Compact className={styles.row}>
        <Input
          value={value}
          placeholder={placeholder}
          readOnly
          aria-label={label}
        />
        <Button
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
      </Space.Compact>
    </div>
  )
}

export { PathField }
export type { PathFieldProps }
