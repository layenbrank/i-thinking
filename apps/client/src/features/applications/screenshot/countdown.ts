import { invoke } from '@tauri-apps/api/core'

const COUNTDOWN_SECONDS = 3
const HOST_ID = 'screenshot-countdown-host'

let activeTimer: ReturnType<typeof setInterval> | null = null
let remaining = 0

function removeHost() {
  const host = document.getElementById(HOST_ID)
  if (host) host.remove()
}

function renderHost(seconds: number) {
  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = HOST_ID
    host.setAttribute('role', 'status')
    host.setAttribute('aria-live', 'assertive')
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '100000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      fontSize: '72px',
      fontWeight: '700',
      letterSpacing: '0.04em',
      pointerEvents: 'auto',
      cursor: 'pointer',
      userSelect: 'none'
    } as CSSStyleDeclaration)
    host.addEventListener('click', cancelScreenshotCountdown)
    document.addEventListener('keydown', onKeydown)
    document.body.appendChild(host)
  }
  host.textContent = String(seconds)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancelScreenshotCountdown()
}

function clearTimer() {
  if (activeTimer) {
    clearInterval(activeTimer)
    activeTimer = null
  }
  document.removeEventListener('keydown', onKeydown)
}

function cancelScreenshotCountdown() {
  clearTimer()
  removeHost()
  remaining = 0
}

function startScreenshotCountdown() {
  cancelScreenshotCountdown()
  remaining = COUNTDOWN_SECONDS
  renderHost(remaining)

  activeTimer = setInterval(function () {
    remaining -= 1
    if (remaining <= 0) {
      clearTimer()
      removeHost()
      void invoke('screenshot:open')
      return
    }
    renderHost(remaining)
  }, 1000)
}

export { startScreenshotCountdown, cancelScreenshotCountdown }
