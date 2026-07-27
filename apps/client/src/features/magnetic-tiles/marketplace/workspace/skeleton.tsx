import { Skeleton } from 'antd'
import { clsx } from 'clsx'

import { MagneticTile } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/marketplace/workspace/skeleton.module.scss'

const ROW_COUNT = 4
const PAGE_ROW_COUNT = 3

function MarketplaceOverlaySkeleton() {
  return (
    <div className={clsx(styles.skeleton, styles.overlay)}>
      <div className={styles.toolbar}>
        <Skeleton.Input
          active
          size="small"
          className={styles.bar}
        />
        <Skeleton.Button
          active
          size="small"
        />
        <Skeleton.Button
          active
          size="small"
        />
      </div>
      <div className={styles.body}>
        <div className={styles.side}>
          <Skeleton
            active
            title={false}
            paragraph={{ rows: 8, width: ['80%', '60%', '90%', '70%', '85%', '55%', '75%', '65%'] }}
          />
        </div>
        <div className={styles.main}>
          {Array.from({ length: ROW_COUNT }).map(function (_, index) {
            return (
              <div
                key={index}
                className={styles.row}>
                <div className={styles.meta}>
                  <Skeleton
                    active
                    title={{ width: '40%' }}
                    paragraph={{ rows: 2, width: ['90%', '70%'] }}
                  />
                </div>
                <MagneticTile.Skeleton className={styles.thumb} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MarketplacePageSkeleton() {
  return (
    <div className={clsx(styles.skeleton, styles.page)}>
      <div className={styles.toolbar}>
        <Skeleton.Input
          active
          size="small"
          className={styles.bar}
        />
      </div>
      <div className={styles.main}>
        {Array.from({ length: PAGE_ROW_COUNT }).map(function (_, index) {
          return (
            <div
              key={index}
              className={styles.row}>
              <div className={styles.meta}>
                <Skeleton
                  active
                  title={{ width: '35%' }}
                  paragraph={{ rows: 2, width: ['85%', '60%'] }}
                />
              </div>
              <MagneticTile.Skeleton className={styles.thumb} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { MarketplaceOverlaySkeleton, MarketplacePageSkeleton }
