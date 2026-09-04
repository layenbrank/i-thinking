import { Layout } from 'antd'
import { clsx } from 'clsx'

import { Combination } from './components'

import styles from '@/views/overlay/overlay.module.scss'

export default function Overlay() {
  return (
    <Layout className={clsx(styles.overlay)}>
      <Combination.Utility />
      <Combination.Section />
      <Combination.Summary />
    </Layout>
  )
}
