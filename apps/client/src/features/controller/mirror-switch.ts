/**
 * Mirror 切换请求注册表
 * Pager 调用 requestMirrorSwitch；Controller.Mirror 注册实际切换逻辑
 */
type MirrorSwitchHandler = (id: string) => Promise<void>

let handler: MirrorSwitchHandler | null = null
let isSwitching = false
const switchingListeners = new Set<() => void>()

function notifySwitching() {
  for (const listener of switchingListeners) listener()
}

function registerMirrorSwitch(next: MirrorSwitchHandler) {
  handler = next
  return function () {
    if (handler === next) handler = null
  }
}

async function requestMirrorSwitch(id: string) {
  if (!handler || isSwitching) return
  isSwitching = true
  notifySwitching()
  try {
    await handler(id)
  } finally {
    isSwitching = false
    notifySwitching()
  }
}

function findIsMirrorSwitching() {
  return isSwitching
}

function subscribeMirrorSwitching(listener: () => void) {
  switchingListeners.add(listener)
  return function () {
    switchingListeners.delete(listener)
  }
}

export {
  registerMirrorSwitch,
  requestMirrorSwitch,
  findIsMirrorSwitching,
  subscribeMirrorSwitching
}
