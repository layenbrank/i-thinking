/**
 * Overview 壳层：搜索 / Mirror 舞台 / 胶囊浮层 / 登录入口
 */
import { Layout as Payload } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import ReSignIn from '@/features/signin/signin.tsx'
import Controller from '@/features/controller/controller.tsx'
import { EngineSearch } from '@/views/overview/engine/engine-search'
import { OverviewCapsule } from '@/views/overview/overview-capsule'
import styles from '@/views/overview/overview.module.scss'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
  const [signinOpen, setSigninOpen] = useState(false)

  return (
    <Payload className={clsx(styles.overview, styles.payload)}>
      <Prefix className={clsx(styles.overview, styles.prefix)}>
        <EngineSearch />
      </Prefix>
      <Core className={clsx(styles.overview, styles.core)}>
        <Controller.Mirror>
          <Controller.MagneticTile />
        </Controller.Mirror>
      </Core>
      <Suffix className={clsx(styles.overview, styles.suffix)}></Suffix>
      <OverviewCapsule
        onSignIn={function () {
          setSigninOpen(true)
        }}
      />
      <ReSignIn
        open={signinOpen}
        onClose={function () {
          setSigninOpen(false)
        }}
      />
    </Payload>
  )
}
