import { clsx } from 'clsx'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  getCurrentWebviewWindow,
  WebviewWindow
} from '@tauri-apps/api/webviewWindow'
import {
  isRegistered,
  register,
  unregister
} from '@tauri-apps/plugin-global-shortcut'

import styles from '@/views/screenshot/screenshot.module.scss'

type PressEvent = React.MouseEvent<HTMLDivElement>

export default function Screenshot() {
  const [visible, onUpdateVisible] = useState<boolean>(false)

  // 1) 渲染用的数据：放 state（触发重渲染）
  const [rect, updateRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })

  // 使用 rAF 合并高频更新：mousemove 里最多每帧触发一次 setState
  const rafID = useRef<number | null>(null)
  const pendingRect = useRef(rect)

  function updateRectRaf(next: typeof rect) {
    pendingRect.current = next
    if (rafID.current !== null) return

    rafID.current = requestAnimationFrame(() => {
      rafID.current = null
      updateRect(pendingRect.current)
    })
  }

  useEffect(function () {
    return function () {
      if (rafID.current !== null) {
        cancelAnimationFrame(rafID.current)
        rafID.current = null
      }
    }
  }, [])

  // 2) 不需要参与渲染的：放 ref
  const beginSection = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const beginClient = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // 3) 不要在渲染阶段读 ref.current，直接用 state 派生样式
  const properties = {
    width: rect.width,
    height: rect.height,
    top: rect.y,
    left: rect.x,
    // 可选：用 visible 控制显示（也可以改成条件渲染）
    display: visible ? 'block' : 'none'
  } as const

  function onPress(event: PressEvent) {
    if (event.buttons !== 1) return

    const target = event.target as HTMLElement
    if (!target) return

    const closest = target.closest(
      `.${styles.screenshot}.${styles.root}`
    ) as HTMLElement | null
    if (!closest) return

    const closestRect = closest.getBoundingClientRect()

    const clientX = event.clientX
    const clientY = event.clientY

    beginClient.current.x = clientX
    beginClient.current.y = clientY

    const rawBeginX = clientX - closestRect.left
    const rawBeginY = clientY - closestRect.top
    const beginX = rawBeginX + closest.scrollLeft
    const beginY = rawBeginY + closest.scrollTop

    beginSection.current.x = beginX
    beginSection.current.y = beginY

    updateRectRaf({ x: beginX, y: beginY, width: 0, height: 0 })
    onUpdateVisible(true)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('blur', onBlur, { once: true })
    window.addEventListener('mouseup', onRelease, { once: true })
  }

  function onMove(event: MouseEvent) {
    const clientX = event.clientX
    const clientY = event.clientY

    const deltaX = Math.abs(clientX - beginClient.current.x)
    const deltaY = Math.abs(clientY - beginClient.current.y)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance < 50) return

    const target = event.target as HTMLElement
    if (!target) return

    const closest = target.closest(
      `.${styles.screenshot}.${styles.root}`
    ) as HTMLElement | null
    if (!closest) return

    const closestRect = closest.getBoundingClientRect()

    const currentX = event.clientX - closestRect.left
    const currentY = event.clientY - closestRect.top

    const minX = closest.scrollLeft
    const minY = closest.scrollTop
    const maxX = closest.scrollLeft + closest.clientWidth
    const maxY = closest.scrollTop + closest.clientHeight

    const boundedX =
      Math.max(0, Math.min(currentX, closest.clientWidth)) + closest.scrollLeft
    const boundedY =
      Math.max(0, Math.min(currentY, closest.clientHeight)) + closest.scrollTop

    const finalX = Math.max(minX, Math.min(boundedX, maxX))
    const finalY = Math.max(minY, Math.min(boundedY, maxY))

    const x = Math.min(beginSection.current.x, finalX)
    const y = Math.min(beginSection.current.y, finalY)
    const width = Math.abs(finalX - beginSection.current.x)
    const height = Math.abs(finalY - beginSection.current.y)

    updateRectRaf({ x, y, width, height })
  }

  function onRelease(event: MouseEvent) {
    const deltaX = Math.abs(event.clientX - beginClient.current.x)
    const deltaY = Math.abs(event.clientY - beginClient.current.y)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance < 50) {
      onUpdateVisible(false) // 可选：没拖拽就隐藏
    }

    window.removeEventListener('mousemove', onMove)
  }

  function onBlur() {
    window.removeEventListener('mousemove', onMove)
  }

  // ...existing code...

  return (
    <div
      onMouseDown={onPress}
      className={clsx([styles.screenshot, styles.root])}>
      Screenshot
      <div
        style={properties}
        className={clsx([styles.screenshot, styles.overlay])}
      />
    </div>
  )
}
// ...existing code...
