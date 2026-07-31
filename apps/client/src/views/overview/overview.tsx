/**
 * Overview 壳层：搜索 / Mirror 舞台 / 悬浮分页 / 登录入口
 */
import { Layout as Payload, FloatButton } from 'antd'
import { clsx } from 'clsx'
import { Icon } from '@iconify/react/offline'
import { useState } from 'react'

import ReSignIn from '@/features/signin/signin.tsx'
import Controller from '@/features/controller/controller.tsx'
import { EngineSearch } from '@/views/overview/engine/engine-search'
import { MirrorPager } from '@/views/overview/mirror-pager'
import styles from '@/views/overview/overview.module.scss'

const { Content: Core, Header: Prefix } = Payload

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
      {/* 挂在 Layout 根下并用 fixed，避免被 Mirror scroller 全高层盖住 */}
      <MirrorPager />
      <FloatButton.Group
        trigger="click"
        placement="top"
        style={{
          bottom: 30,
          insetInlineEnd: 30,
          position: 'absolute'
        }}
        icon={<Icon icon="ant-design:arrow-up-outlined" />}>
        <FloatButton
          icon={<Icon icon="ant-design:login-outlined" />}
          onClick={function () {
            setSigninOpen(true)
          }}
        />
        <FloatButton icon={<Icon icon="ant-design:logout-outlined" />} />
      </FloatButton.Group>
      <ReSignIn
        open={signinOpen}
        onClose={function () {
          setSigninOpen(false)
        }}
      />
    </Payload>
  )
}
