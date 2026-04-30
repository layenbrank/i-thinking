import { clsx } from 'clsx'
import Konva from 'konva'
import { AnimatePresence, motion } from 'motion/react'
import { useMount, useSize, useMouseWheel, useMouse } from 'react-use'
import { useHotkeys } from 'react-hotkeys-hook'
import { v4 as UUID } from 'uuid'

import { Annotation } from '@/views/screenshot/components/annotation'
import { type ShapeEnum, type ShapeProps } from '@/views/screenshot/components/shape'
import Utility from '@/views/screenshot/components/utility'

import styles from '@/views/screenshot/screenshot.module.scss'

type PressEvent = Konva.KonvaEventObject<MouseEvent>
type MoveEvent = Konva.KonvaEventObject<MouseEvent>
type ReleaseEvent = Konva.KonvaEventObject<MouseEvent>

export type Phase = 'selecting' | 'updating'

export default function Screenshot() {
  const [phase, onUpdatePhase] = useState<Phase>('selecting')
  const [shape, onUpdateShape] = useState<ShapeEnum | null>(null)
  const [annotations, onUpdateAnnotations] = useState<ShapeProps[]>([])
  const [selection, onUpdateSelection] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [begin, onUpdateBegin] = useState({
    x: 0,
    y: 0
  })
  const [final, onUpdateFinal] = useState({
    x: 0,
    y: 0
  })
  const [color, onUpdateColor] = useState('#4080ff')
  const [thickness, onUpdateThickness] = useState(2)
  const [ID, onUpdateID] = useState<string | null>(null)

  function handlePress(event: PressEvent) {
    const clientX = event.evt.clientX
    const clientY = event.evt.clientY

    onUpdateBegin(function () {
      return {
        x: clientX,
        y: clientY
      }
    })

    const phasemap: Record<Phase, () => void> = {
      selecting() {
        onUpdateSelection({
          x: clientX,
          y: clientY,
          w: 0,
          h: 0
        })
      },
      updating() {
        onUpdateAnnotations(function (prev) {
          const newID = UUID()
          onUpdateID(newID)
          if (!newID) return prev
          return prev.concat([
            {
              color: color,
              fontSize: thickness,
              points: [{ x: clientX, y: clientY }],
              type: shape,
              id: newID,
              thickness: thickness
            }
          ])
        })
      }
    }
    phasemap[phase]?.()
  }
  function handleMove(event: MoveEvent) {
    const clientX = event.evt.clientX
    const clientY = event.evt.clientY

    const phasemap: Record<Phase, () => void> = {
      selecting() {},
      updating() {
        onUpdateAnnotations(function (prev) {
          if (!ID) return prev
          console.log('handleRelease updating', prev)

          for (const value of prev) {
            if (value.id !== ID) continue
            value.width = clientX - begin.x
            // value.height = clientY - begin.y
          }
          return prev
        })
      }
    }
    phasemap[phase]?.()
  }
  function handleRelease(event: ReleaseEvent) {
    const clientX = event.evt.clientX
    const clientY = event.evt.clientY

    onUpdateFinal(function () {
      return {
        x: clientX,
        y: clientY
      }
    })

    const phasemap: Record<Phase, () => void> = {
      selecting() {
        onUpdateSelection({
          x: clientX,
          y: clientY,
          w: clientX - begin.x,
          h: clientY - begin.y
        })
      },
      updating() {
        onUpdateAnnotations(function (prev) {
          if (!ID) return prev
          console.log('handleRelease updating', prev)

          for (const value of prev) {
            if (value.id !== ID) continue
            value.points.push({ x: clientX, y: clientY })
          }
          return prev
        })
      }
    }
    phasemap[phase]?.()
    onUpdateID(null)
  }

  function handleRefresh() {
    onUpdateSelection(null)
    onUpdateBegin({ x: 0, y: 0 })
    onUpdateFinal({ x: 0, y: 0 })
  }

  useEffect(
    function () {
      if (!shape) return
      onUpdatePhase('updating')
    },
    [shape]
  )

  useEffect(
    function () {
      console.log('[DEBUG] annotations', annotations)
    },
    [annotations]
  )

  return (
    <div className={clsx(styles.screenshot)}>
      <Annotation
        annotations={annotations}
        onMove={handleMove}
        onPress={handlePress}
        onRelease={handleRelease}
      />
      {/* 全屏遮罩（无选区时） */}
      <AnimatePresence>
        {phase === 'selecting' && !selection && (
          <motion.div
            className={clsx(styles.fullscreen, styles.mask)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <Utility
        selection={selection}
        canRedo={false}
        canUndo={false}
        active={shape}
        color={color}
        thickness={thickness}
        onClose={() => {}}
        onUpdateColor={onUpdateColor}
        onCopy={() => {}}
        onPin={() => {}}
        onRedo={() => {}}
        onRefresh={handleRefresh}
        onPreserve={() => {}}
        onUpdateThickness={onUpdateThickness}
        onUndo={() => {}}
        onUpdateUtility={onUpdateShape}
      />
    </div>
  )
}
