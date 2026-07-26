import { clsx } from 'clsx'

import styles from '@/features/magnetic-tiles/collection/controller.module.scss'
import Navigation from '../navigation/navigation.tsx'

interface ControllerProps {
  magneticTiles: readonly MagneticTile[]
  onClick?: React.MouseEventHandler<HTMLDivElement>
  onPrevent?: React.MouseEventHandler<HTMLDivElement>
}

function Controller(props: ControllerProps) {
  const size: Mirror.Size = 'mini'
  const shape: Mirror.Shape = 'rectangle'
  const direction: Mirror.Direction = 'horizontal'

  return (
    <div
      onClick={props.onClick}
      className={clsx([styles[size], styles[shape], styles[direction], styles.magneticTile])}>
      {props.magneticTiles?.map(function (value) {
        return (
          <Navigation
            {...value}
            onPrevent={props.onPrevent}
            key={value.id}
            size={size}
            shape={shape}
            direction={direction}
          />
        )
      })}
    </div>
  )
}

export { Controller }
