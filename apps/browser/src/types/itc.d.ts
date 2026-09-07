/**
 * chrome://i-thinking WebUI：globalThis.itc / window.itc
 */
import type { BrowserItc } from '@/bridges/itc'

declare global {
  interface Window {
    itc: BrowserItc
  }

  // eslint-disable-next-line no-var
  var itc: BrowserItc
}

export {}
