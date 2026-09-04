import { Layout } from 'antd'
import { clsx } from 'clsx'

import Controller from '@/features/controller/controller.tsx'

import styles from '@/views/overlay/components/section.module.scss'

function Section() {
  return (
    <Layout.Content className={clsx(styles.section)}>
      <Controller.Mirror>
        <Controller.MagneticTile />
      </Controller.Mirror>
    </Layout.Content>
  )
}

export default Section
