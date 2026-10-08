import { screen, type BrowserWindow } from 'electron'

type ThroughRect = { x: number; y: number; w: number; h: number }

interface ThroughHost {
  updateRects(source: string, rects: ThroughRect[]): void
  updateCaptureMode(enabled: boolean): void
  dispose(): void
}

/**
 * Overlay 点击穿透：按 source 汇总 hit-rects，50ms 轮询光标决定 setIgnoreMouseEvents。
 * 语义对齐 client：仅 `[data-region='false']` 为可点 hit；其余区域（含无标记 / `true`）穿透。
 * capture 模式下永不穿透。
 */
function buildThroughHost(findWindow: () => BrowserWindow | null): ThroughHost {
  const sources = new Map<string, ThroughRect[]>()
  let captureMode = false
  let lastIgnore: boolean | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  function applyIgnore(win: BrowserWindow, shouldIgnore: boolean): void {
    if (lastIgnore === shouldIgnore) return
    lastIgnore = shouldIgnore
    try {
      if (shouldIgnore) {
        win.setIgnoreMouseEvents(true, { forward: true })
      } else {
        win.setIgnoreMouseEvents(false)
      }
    } catch (error) {
      console.error('applyIgnore', error)
      lastIgnore = null
    }
  }

  function tick(): void {
    const win = findWindow()
    if (!win || win.isDestroyed() || !win.isVisible()) {
      lastIgnore = null
      return
    }

    if (captureMode) {
      applyIgnore(win, false)
      return
    }

    const bounds = win.getBounds()
    const point = screen.getCursorScreenPoint()
    const scale = win.webContents.getZoomFactor() || 1
    // getBounds 已是 DIP（逻辑像素）；与 getBoundingClientRect 同源
    const localX = Math.floor(point.x - bounds.x)
    const localY = Math.floor(point.y - bounds.y)
    const inside =
      localX >= 0 && localY >= 0 && localX < bounds.width * scale && localY < bounds.height * scale

    if (!inside) {
      applyIgnore(win, true)
      return
    }

    let hit = false
    for (const rects of sources.values()) {
      for (const rect of rects) {
        if (
          localX >= rect.x &&
          localY >= rect.y &&
          localX < rect.x + rect.w &&
          localY < rect.y + rect.h
        ) {
          hit = true
          break
        }
      }
      if (hit) break
    }

    applyIgnore(win, !hit)
  }

  timer = setInterval(tick, 50)

  return {
    updateRects(source, rects) {
      if (rects.length === 0) {
        sources.delete(source)
      } else {
        sources.set(source, rects)
      }
    },
    updateCaptureMode(enabled) {
      captureMode = enabled
      lastIgnore = null
      tick()
    },
    dispose() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      sources.clear()
    }
  }
}

export { buildThroughHost }
export type { ThroughHost, ThroughRect }
