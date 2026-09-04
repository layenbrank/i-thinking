import type { App, BrowserWindow } from 'electron'

/**
 * 在 app.whenReady 之前调用。未拿到锁时当前进程应立即 quit。
 */
function acquireSingleInstanceLock(app: App): boolean {
  return app.requestSingleInstanceLock()
}

function focusWindow(win: BrowserWindow | null | undefined): void {
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}

/**
 * 二次启动时聚焦已有主窗（主实例尚未建窗时为 no-op）。
 */
function attachSecondInstanceFocus(app: App, findWindow: () => BrowserWindow | null): void {
  app.on('second-instance', function () {
    focusWindow(findWindow())
  })
}

export { acquireSingleInstanceLock, attachSecondInstanceFocus, focusWindow }
