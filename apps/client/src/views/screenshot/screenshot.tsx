import { clsx } from 'clsx'
import Konva from 'konva'

import { Annotation } from '@/views/screenshot/components/annotation'
import Utility from '@/views/screenshot/components/utility'

import styles from '@/views/screenshot/screenshot.module.scss'

type PressEvent = Konva.KonvaEventObject<MouseEvent>
type MoveEvent = Konva.KonvaEventObject<MouseEvent>
type ReleaseEvent = Konva.KonvaEventObject<MouseEvent>

export default function Screenshot() {
  const [begin, onUpdateBegin] = useState({
    x: 0,
    y: 0
  })
  const [final, onUpdateFinal] = useState({
    x: 0,
    y: 0
  })

  function handlePress(event: PressEvent) {
    console.log('Press event:', event)
  }
  function handleMove(event: MoveEvent) {
    console.log('Move event:', event)
  }
  function handleRelease(event: ReleaseEvent) {
    console.log('Release event:', event)
  }

  return (
    <div className={clsx(styles.screenshot)}>
      <Annotation
        onMove={handleMove}
        onPress={handlePress}
        onRelease={handleRelease}
      />
      <Utility
        rect={{
          w: 100,
          h: 100,
          x: 100,
          y: 100
        }}
        canRedo={false}
        canUndo={false}
        active={'ellipse'}
        color={'#4080ff'}
        thickness={4}
        onClose={() => {}}
        onColorChange={() => {}}
        onCopy={() => {}}
        onPin={() => {}}
        onRedo={() => {}}
        onRefresh={() => {}}
        onSave={() => {}}
        onThicknessChange={() => {}}
        onUndo={() => {}}
        onUtilityChange={() => {}}
      />
    </div>
  )
}
