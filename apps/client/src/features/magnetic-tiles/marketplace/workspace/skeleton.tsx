import { useContext } from 'react'
import { clsx } from 'clsx'

import {
  MarketplaceContext,
  type MarketplaceMode
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import styles from '@/features/magnetic-tiles/marketplace/workspace/skeleton.module.scss'

const BOOT_ROWS = 3
const NAVIGATE_ROWS = 6
const SIDE_ITEMS = 7

type ModeSkeletonProps = {
  mode?: MarketplaceMode
}

function SideSkeleton() {
  return (
    <aside className={styles.side}>
      <div className={styles.sideInner}>
        {Array.from({ length: SIDE_ITEMS }).map(function (_, index) {
          return (
            <div
              key={index}
              className={styles.sideItem}
            />
          )
        })}
      </div>
    </aside>
  )
}

function BoothRows() {
  return (
    <div className={styles.boothList}>
      {Array.from({ length: BOOT_ROWS }).map(function (_, index) {
        return (
          <div
            key={index}
            className={styles.boothCard}>
            <div className={styles.boothMeta}>
              <div className={styles.boothHead}>
                <div className={styles.avatar} />
                <div className={styles.copy}>
                  <div className={clsx(styles.line, styles.lineTitle)} />
                  <div className={clsx(styles.line, styles.lineDesc)} />
                  <div className={clsx(styles.line, styles.lineMeta)} />
                </div>
              </div>
              <div className={styles.controls}>
                <div className={styles.control} />
                <div className={styles.control} />
                <div className={styles.control} />
                <div className={styles.control} />
              </div>
            </div>
            <div className={styles.preview} />
          </div>
        )
      })}
    </div>
  )
}

function NavigateRows() {
  return (
    <div className={styles.navigateGrid}>
      {Array.from({ length: NAVIGATE_ROWS }).map(function (_, index) {
        return (
          <div
            key={index}
            className={styles.navigateCard}>
            <div className={styles.avatar} />
            <div className={styles.navigateBody}>
              <div className={clsx(styles.line, styles.lineTitle)} />
              <div className={clsx(styles.line, styles.lineDesc)} />
              <div className={clsx(styles.line, styles.lineMeta)} />
            </div>
            <div className={styles.navigateAside}>
              <div className={styles.badge} />
              <div className={styles.add} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CustomizeSkeleton() {
  return (
    <div className={styles.customizeBody}>
      <div className={styles.formPanel}>
        <div className={styles.formLine} />
        <div className={styles.formLine} />
        <div className={styles.formBlock} />
        <div className={styles.formLine} />
        <div className={styles.formBlock} />
      </div>
      <div className={styles.previewPanel}>
        <div className={styles.previewCard} />
      </div>
    </div>
  )
}

function ModeSkeleton(props: ModeSkeletonProps) {
  const mode = props.mode ?? 'booth'

  if (mode === 'customize') {
    return <CustomizeSkeleton />
  }

  return (
    <div className={styles.body}>
      <SideSkeleton />
      <div className={styles.main}>{mode === 'navigate' ? <NavigateRows /> : <BoothRows />}</div>
    </div>
  )
}

/** 打开 Overlay 时默认 booth 布局 */
function OverlaySkeleton() {
  return (
    <div className={clsx(styles.skeleton, styles.overlay)}>
      <ModeSkeleton mode="booth" />
    </div>
  )
}

/** mode 切换时按当前 mode 镜像 */
function PageSkeleton() {
  const { mode } = useContext(MarketplaceContext)

  return (
    <div className={clsx(styles.skeleton, styles.page)}>
      <ModeSkeleton mode={mode} />
    </div>
  )
}

export { OverlaySkeleton, PageSkeleton }
