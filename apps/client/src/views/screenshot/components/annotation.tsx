import ReShape from '@/views/screenshot/components/shape'
import { clsx } from 'clsx'
import { Image as ReImage, Layer, Stage, Transformer, type KonvaNodeEvents } from 'react-konva'

import styles from '@/views/screenshot/components/annotation.module.scss'

interface AnnotationProps {
  onRelease: KonvaNodeEvents['onMouseUp']
  onPress: KonvaNodeEvents['onMouseDown']
  onMove: KonvaNodeEvents['onMouseMove']
}

const image = new Image()
image.src = 'https://picsum.photos/200/300'
export function Annotation(props: AnnotationProps) {
  const { onPress, onMove, onRelease } = props
  const [annotations, onUpdateAnnotations] = useState([])

  return (
    <div className={clsx(styles.annotation)}>
      <Stage
        onMouseMove={onMove}
        onMouseDown={onPress}
        onMouseUp={onRelease}
        width={window.innerWidth}
        height={window.innerHeight}
        className={clsx(styles.stage)}>
        {/* 背景层：裁剪的截图（物理像素缩放到 CSS 尺寸） */}
        <Layer listening={false}>
          <ReImage
            image={image}
            listening={false}
          />
        </Layer>
        {/* 标注层：已提交的标注始终可拖拽 */}
        <Layer listening={true}>
          {/* <ReShape /> */}
          <Transformer
            rotateEnabled={false}
            borderStroke="#4080FF"
            anchorStroke="#4080FF"
            anchorFill="#FFFFFF"
            anchorSize={10}
            keepRatio={false}
            anchorCornerRadius={2}
            boundBoxFunc={function (source, target) {
              if (Math.abs(target.width) < 10) return source
              if (Math.abs(target.height) < 10) return source
              return target
            }}
          />
        </Layer>
      </Stage>
    </div>
  )
}
