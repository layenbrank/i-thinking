import { Segmented } from 'antd'
import { clsx } from 'clsx'

import styles from '@/features/magnetic-tiles/marketplace/workspace/bucket.module.scss'

type Option<T extends string> = {
  label: string
  value: T
}

type BucketProps<T extends string> = {
  value: T
  options: Array<Option<T>>
  onUpdate: (value: T) => void
}

function Bucket<T extends string>(props: BucketProps<T>) {
  return (
    <div className={clsx(styles.bucket)}>
      <Segmented
        value={props.value}
        options={props.options}
        orientation="vertical"
        rootClassName={styles.segmented}
        onChange={function (next) {
          props.onUpdate(next as T)
        }}
      />
    </div>
  )
}

export { Bucket }
export type { BucketProps, Option }
