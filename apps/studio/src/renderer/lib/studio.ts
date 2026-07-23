import type { Studio } from '@shared/ipc/studio'

export function findStudio(): Studio {
  if (typeof window === 'undefined' || !window.studio) {
    throw new Error('window.studio is unavailable (not running in Electron?)')
  }
  return window.studio
}

export type { Studio }
