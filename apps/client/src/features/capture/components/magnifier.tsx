import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import styles from './magnifier.module.scss'

/** 放大镜显示尺寸（px） */
const SIZE = 172
/** 放大倍数 */
const ZOOM = 8
/** 采样源尺寸 = 显示尺寸 / 放大倍数 */
const SOURCE_SIZE = SIZE / ZOOM
/** 距离鼠标偏移 */
const OFFSET = 20

/** Spring 配置：快速跟手，略带惯性 */
const SPRING = { stiffness: 520, damping: 40, mass: 0.5 }

type ColorFormat = 'hex' | 'rgb'

interface MagnifierProps {
  /** 采样底图（一般是当前屏幕截图） */
  sourceImage: HTMLImageElement | null
  /** 是否可见 */
  visible: boolean
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

function computePos(px: number, py: number) {
  let left = px + OFFSET
  let top = py + OFFSET
  if (left + SIZE + 40 > window.innerWidth) left = px - SIZE - OFFSET
  if (top + SIZE + 104 > window.innerHeight) top = py - SIZE - OFFSET - 84
  return { left, top }
}

/**
 * 放大镜：跟随鼠标、显示像素级放大、十字准星、当前坐标与中心像素颜色。
 * - Shift 切换 HEX / RGB 格式
 * - C 复制当前颜色值
 */
export default function Magnifier({ sourceImage, visible }: MagnifierProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [rgb, setRgb] = useState<[number, number, number] | null>(null)
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [copied, setCopied] = useState(false)

  // Spring 平滑跟随鼠标
  const motionX = useMotionValue(0)
  const motionY = useMotionValue(0)
  const springX = useSpring(motionX, SPRING)
  const springY = useSpring(motionY, SPRING)
  const isFirstMoveRef = useRef(true)

  useEffect(() => {
    if (!visible) {
      setPos(null)
      isFirstMoveRef.current = true
      return
    }
    function onMove(e: MouseEvent) {
      const p = { x: e.clientX, y: e.clientY }
      setPos(p)
      const { left, top } = computePos(p.x, p.y)
      if (isFirstMoveRef.current) {
        // 首次出现：跳到正确位置，避免从 (0,0) 滑入
        springX.jump(left)
        springY.jump(top)
        isFirstMoveRef.current = false
      } else {
        motionX.set(left)
        motionY.set(top)
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [visible, motionX, motionY, springX, springY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage || !pos) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, SIZE, SIZE)
    // sourceImage 自然尺寸可能 != 窗口尺寸，按比例换算到底图坐标
    const scaleX = sourceImage.naturalWidth / window.innerWidth
    const scaleY = sourceImage.naturalHeight / window.innerHeight
    const sx = pos.x * scaleX - SOURCE_SIZE / 2
    const sy = pos.y * scaleY - SOURCE_SIZE / 2
    ctx.drawImage(sourceImage, sx, sy, SOURCE_SIZE, SOURCE_SIZE, 0, 0, SIZE, SIZE)
    try {
      const data = ctx.getImageData(SIZE / 2, SIZE / 2, 1, 1).data
      setRgb([data[0], data[1], data[2]])
    } catch {
      // 跨域底图会抛 SecurityError，忽略 RGB
      setRgb(null)
    }
  }, [pos, sourceImage])

  useEffect(() => {
    if (!visible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        setColorFormat((f) => (f === 'hex' ? 'rgb' : 'hex'))
      }
      if (e.key === 'c' || e.key === 'C') {
        if (!rgb) return
        const text =
          colorFormat === 'hex'
            ? rgbToHex(rgb[0], rgb[1], rgb[2])
            : `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, rgb, colorFormat])

  const color = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : 'transparent'
  const displayColor = rgb
    ? colorFormat === 'hex'
      ? rgbToHex(rgb[0], rgb[1], rgb[2])
      : `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    : '—'

  return (
    <AnimatePresence>
      {visible && pos && (
        <motion.div
          className={styles.magnifier}
          style={{ left: springX, top: springY, width: SIZE, pointerEvents: 'none' }}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.82 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}>
          {/* 放大画布 + 十字准星 */}
          <div className={styles.magnifierCanvasWrap}>
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className={styles.magnifierCanvas}
            />
            <div className={styles.crosshairV} />
            <div className={styles.crosshairH} />
            <div className={styles.centerPixel} />
          </div>

          {/* 信息面板 */}
          <div className={styles.magnifierPanel}>
            {/* 颜色行 */}
            <div className={styles.magnifierColorRow}>
              <motion.span
                className={styles.colorSwatch}
                animate={{ backgroundColor: color }}
                transition={{ duration: 0.18 }}
              />
              <div className={styles.colorTextWrap}>
                <AnimatePresence
                  mode="popLayout"
                  initial={false}>
                  <motion.span
                    key={displayColor}
                    className={styles.colorText}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}>
                    {displayColor}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* 坐标行 */}
            <div className={styles.magnifierMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>POS</span>
                <span className={styles.metaValue}>
                  {Math.round(pos.x)}, {Math.round(pos.y)}
                </span>
              </div>
            </div>

            {/* 快捷键提示行 */}
            <div className={styles.magnifierHints}>
              <AnimatePresence initial={false}>
                {copied ? (
                  <motion.div
                    key="copied"
                    className={styles.copiedBanner}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}>
                    ✓ 已复制
                  </motion.div>
                ) : (
                  <motion.div
                    key="hints"
                    className={styles.hintsRow}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}>
                    <span className={styles.hintItem}>
                      <kbd className={styles.kbd}>Shift</kbd>
                      <AnimatePresence
                        mode="popLayout"
                        initial={false}>
                        <motion.span
                          key={colorFormat}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.12 }}>
                          {colorFormat === 'hex' ? 'RGB' : 'HEX'}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className={styles.hintItem}>
                      <kbd className={styles.kbd}>C</kbd>
                      <span>复制</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
