import { clsx } from 'clsx'
import styles from './thumbnail.module.scss'

interface ThumbnailProps {
  image: Morph.PageImage
  pageIndex: number
  isActive: boolean
  annotationCount: number
  pageLabel?: string
  onClick: () => void
}

export default function Thumbnail({
  image,
  pageIndex,
  isActive,
  annotationCount,
  pageLabel,
  onClick
}: ThumbnailProps) {
  return (
    <div
      className={clsx([styles.thumbnail, isActive && styles.active])}
      onClick={onClick}>
      <div className={styles.imageWrap}>
        <img
          className={styles.img}
          src={`data:image/png;base64,${image.data_base64}`}
          alt={`第 ${pageIndex + 1} 页`}
          draggable={false}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.pageNum}>第 {pageIndex + 1} 页</span>
        {pageLabel && <span className={styles.pageLabel}>{pageLabel}</span>}
        <span className={styles.count}>
          {annotationCount > 0 ? `${annotationCount} 条批注` : '0 条批注'}
        </span>
      </div>
    </div>
  )
}
