import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties } from 'react'

import type { SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { MagneticTile } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from './navigation.module.scss'

import Marker from './marker.tsx'
import { useMirrorStore } from '@/stores/mirror'

interface NavigationProps extends Omit<SectionProps, 'children'> {
  style?: CSSProperties
  className?: ClassValue
  onPrevent?: React.MouseEventHandler<HTMLDivElement>
}

/** 导航磁贴：双击经 SIDE_CHANNELS.navigation → window.open（系统浏览器）。 */
export default function Navigation(props: NavigationProps) {
  function onTrash() {
    void useMirrorStore
      .getState()
      .toRemoveTile(props.id)
      .catch(function (error) {
        console.error('[navigation] 删除磁贴失败', error)
      })
  }

  return (
    <MagneticTile.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.navigation)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
        mark={props.mark}
        title={props.title}
      />
    </MagneticTile.Section>
  )
}
