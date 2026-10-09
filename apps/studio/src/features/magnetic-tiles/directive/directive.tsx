import clsx from 'clsx'

import { MagneticTile, type SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from './directive.module.scss'
import { useMirrorStore } from '@/stores/mirror'

import Marker from './marker.tsx'

type Props = Omit<SectionProps, 'children'>

/**
 * 指令磁贴：双击经侧通道 `itc.window.toOpen({ key: 'directive' })` 打开独立窗口（`/directive`）。
 */
export default function Directive(props: Props) {
  function onTrash() {
    void useMirrorStore
      .getState()
      .toRemoveTile(props.id)
      .catch(function (error) {
        console.error('[directive] 删除磁贴失败', error)
      })
  }

  return (
    <MagneticTile.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.directive)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
    </MagneticTile.Section>
  )
}
