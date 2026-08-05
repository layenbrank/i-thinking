import { clsx } from 'clsx'

import { CSSVAR } from '@/themes'
import styles from './thumbnail.module.scss'

interface ThumbnailProps {
  image: Morph.PageImage
  pageIndex: number
  isActive: boolean
  annotationCount: number
  pageLabel?: string
  onClick: () => void
}

export default function Thumbnail(props: ThumbnailProps) {
  const { image, pageIndex, isActive, annotationCount, pageLabel, onClick } = props

  return (
    <div
      className={clsx(styles.thumbnail, CSSVAR.KEY, isActive && styles.active)}
      onClick={onClick}>
      <div className={styles.imageWrap}>
        <img
          className={styles.img}
          src={`data:image/png;base64,${image.data_base64}`}
          alt={`第 ${pageIndex + 1} 页`}
          draggable={false}
        />
        {annotationCount > 0 ? (
          <span className={styles.badge} aria-label={`${annotationCount} 条批注`}>
            {annotationCount}
          </span>
        ) : null}
      </div>
      <div className={styles.meta}>
        <span className={styles.pageNum}>{pageIndex + 1}</span>
        {pageLabel ? <span className={styles.pageLabel}>{pageLabel}</span> : null}
      </div>
    </div>
  )
}
