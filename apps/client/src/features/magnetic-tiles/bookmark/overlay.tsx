import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/bookmark/overlay.module.scss'

// interface Props {}

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </MagneticTile.Overlay>
  )
}
