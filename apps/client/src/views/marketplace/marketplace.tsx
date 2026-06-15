'use client'
import { clsx } from 'clsx'
import { Outlet } from 'react-router-dom'

import styles from '@/views/marketplace/marketplace.module.scss'

export default function () {
  return (
    <div className={clsx([styles.marketplace])}>
      <Outlet />
    </div>
  )
}
