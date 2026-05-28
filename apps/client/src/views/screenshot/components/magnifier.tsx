import { useEffect, useRef, useState } from 'react'

/** 放大镜显示尺寸（px） */
const SIZE = 120
/** 放大倍数 */
const ZOOM = 8
/** 采样源尺寸 = 显示尺寸 / 放大倍数 */
const SOURCE_SIZE = SIZE / ZOOM
/** 距离鼠标偏移 */
const OFFSET = 16

interface MagnifierProps {
  /** 采样底图（一般是当前屏幕截图） */
  sourceImage: HTMLImageElement | null
  /** 是否可见 */
  visible: boolean
}

/**
 * 放大镜：跟随鼠标、显示像素级放大、十字准星、当前坐标与中心像素 RGB。
 * - 通过 window mousemove 监听全屏指针位置
 * - 用 canvas + drawImage(..., crop) 实现像素采样
 * - 自动避开屏幕边缘
 */
export default function Magnifier(props: MagnifierProps) {
  const { sourceImage, visible } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [rgb, setRgb] = useState<[number, number, number] | null>(null)

  useEffect(
    function () {
      if (!visible) {
        setPos(null)
        return
      }
      function onMove(e: MouseEvent) {
        setPos({ x: e.clientX, y: e.clientY })
      }
      window.addEventListener('mousemove', onMove)
      return function () {
        window.removeEventListener('mousemove', onMove)
      }
    },
    [visible]
  )

  useEffect(
    function () {
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
    },
    [pos, sourceImage]
  )

  if (!visible || !pos) return null

  const TEXT_H = 40
  let left = pos.x + OFFSET
  let top = pos.y + OFFSET
  if (left + SIZE + 12 > window.innerWidth) left = pos.x - SIZE - OFFSET
  if (top + SIZE + TEXT_H + 12 > window.innerHeight) top = pos.y - SIZE - TEXT_H - OFFSET

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        pointerEvents: 'none',
        zIndex: 300,
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        borderRadius: 6,
        padding: 6,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}>
      <div
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          style={{ display: 'block' }}
        />
        {/* 十字准星 */}
        <div
          style={{
            position: 'absolute',
            left: SIZE / 2,
            top: 0,
            width: 1,
            height: SIZE,
            background: 'rgba(255, 64, 64, 0.7)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: SIZE / 2,
            left: 0,
            height: 1,
            width: SIZE,
            background: 'rgba(255, 64, 64, 0.7)'
          }}
        />
      </div>
      <div style={{ marginTop: 4 }}>{`(${pos.x}, ${pos.y})`}</div>
      {rgb && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          />
          <span>{`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`}</span>
        </div>
      )}
    </div>
  )
}
