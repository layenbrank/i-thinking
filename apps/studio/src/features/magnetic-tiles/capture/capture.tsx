import clsx from 'clsx'

import { MagneticTile, type SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from './capture.module.scss'
import { useMirrorStore } from '@/stores/mirror'

import Marker from './marker.tsx'

type Props = Omit<SectionProps, 'children'>

/**
 * 截屏磁贴（主窗 Mirror）：Alt+Q / 双击 → capture:open（SIDE_CHANNELS.capture）。
 */
export default function Capture(props: Props) {
  function onTrash() {
    void useMirrorStore
      .getState()
      .toRemoveTile(props.id)
      .catch(function (error) {
        console.error('[capture] 删除磁贴失败', error)
      })
  }

  return (
    <MagneticTile.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.capture)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
    </MagneticTile.Section>
  )
}
