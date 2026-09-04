import { Layout } from 'antd'
import { clsx } from 'clsx'

import styles from '@/views/overview/components/summary.module.scss'

function Summary() {
  return <Layout.Footer className={clsx(styles.summary)}></Layout.Footer>
}

export default Summary
