import { emitTo, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { clsx } from 'clsx'

import styles from '@/views/screenshot/screenshot.module.scss'

type PressEvent = React.MouseEvent<HTMLDivElement>

export default function Screenshot() {
  const [visible, onUpdateVisible] = useState<boolean>(false)
  const visibleRef = useRef(false)

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

  function hideSelection() {
    visibleRef.current = false
    onUpdateVisible(false)
    // 避免下一次显示时短暂闪现旧选区
    const empty = { x: 0, y: 0, width: 0, height: 0 }
    pendingRect.current = empty
    updateRect(empty)
  }

  function updateRectRaf(next: typeof rect) {
    pendingRect.current = next
    if (rafID.current !== null) return

    rafID.current = requestAnimationFrame(() => {
      rafID.current = null
      updateRect(pendingRect.current)
    })
  }

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

    // 避免浏览器默认拖拽/选择行为干扰截图拖拽
    event.preventDefault()

    // 开始新一轮拖拽前，确保清空旧选区，避免短暂显示旧状态
    hideSelection()

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

    // 按下这一刻不要走 raf：否则 render 会先用上一次 rect，造成“第二次闪烁”。
    if (rafID.current !== null) {
      cancelAnimationFrame(rafID.current)
      rafID.current = null
    }
    const initial = { x: beginX, y: beginY, width: 0, height: 0 }
    pendingRect.current = initial
    updateRect(initial)
    // 只在移动后再显示选区（符合“按下并移动后触发选区”）

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
    if (!visibleRef.current) {
      // 轻微阈值，避免按下时立即显示一个 0x0 的点
      if (distance < 2) return
      visibleRef.current = true
      onUpdateVisible(true)
    }

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

  function onRelease(_event: MouseEvent) {
    hideSelection()

    window.removeEventListener('mousemove', onMove)
  }

  function onBlur() {
    window.removeEventListener('mousemove', onMove)
    hideSelection()
  }

  useEffect(function () {
    // 通知 main：截图页已渲染，可显示窗口
    void emitTo('main', 'screenshot:ready', { label: 'screenshot' })

    let unlisten: (() => void) | null = null
    let unlistenFocus: (() => void) | null = null

    void WebviewWindow.getCurrent()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          void WebviewWindow.getCurrent().setAlwaysOnTop(true)
          return
        }

        // 失焦（例如按 Win 键打开开始菜单）：只清理选区/拖拽，不隐藏窗口
        hideSelection()
        window.removeEventListener('mousemove', onMove)
      })
      .then((fn) => {
        unlistenFocus = fn
      })

    void listen('screenshot', function (payload) {
      if (payload.payload !== 'cleanup') return
      void WebviewWindow.getByLabel('screenshot').then(function (existing) {
        console.log('register existing', existing)
        // if (existing) void existing.destroy()
        if (existing) void existing.hide()
      })
    }).then(function (fn) {
      unlisten = fn
    })

    return function () {
      unlisten?.()
      unlistenFocus?.()
      if (rafID.current !== null) {
        cancelAnimationFrame(rafID.current)
        rafID.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
