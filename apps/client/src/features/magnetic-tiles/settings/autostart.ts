import { invoke } from '@tauri-apps/api/core'

async function findAutostartEnabled() {
  return invoke<boolean>('autostart:read')
}

async function syncAutostart(desired: boolean) {
  return invoke<boolean>('autostart:update', { enabled: desired })
}

export { findAutostartEnabled, syncAutostart }
