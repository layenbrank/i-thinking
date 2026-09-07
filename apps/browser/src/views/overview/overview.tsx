import { Layout } from 'antd'
import { clsx } from 'clsx'

import { Combination } from '@/views/overview/components/index'

import styles from '@/views/overview/overview.module.scss'

export default function Overview() {
  const [visible, onUpdateVisible] = useState(false)

  return (
    <Layout className={clsx(styles.overview)}>
      <Combination.Utility />
      <Combination.Section />
      <Combination.Summary />
    </Layout>
  )
}
