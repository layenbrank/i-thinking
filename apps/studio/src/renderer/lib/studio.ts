import type { StudioApi } from '../../shared/ipc/contracts'

export function findStudio(): StudioApi {
  if (typeof window === 'undefined' || !window.studio) {
    throw new Error('window.studio is unavailable (not running in Electron?)')
  }
  return window.studio
}

export type { StudioApi }
