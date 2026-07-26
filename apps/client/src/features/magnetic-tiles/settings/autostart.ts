import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'

async function findAutostartEnabled() {
  return isEnabled()
}

async function syncAutostart(desired: boolean) {
  const enabled = await isEnabled()
  if (desired === enabled) return enabled

  if (desired) {
    await enable()
  } else {
    await disable()
  }

  return isEnabled()
}

export { findAutostartEnabled, syncAutostart }
