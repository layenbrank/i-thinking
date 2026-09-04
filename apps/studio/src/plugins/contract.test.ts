import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { CHANNELS } from './channels'
import type { ITC } from './itc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Runtime namespaces expected on window.itc / Studio type */
const STUDIO_NAMESPACES = [
  'store',
  'dialog',
  'user',
  'sidecar',
  'doc',
  'screenshot',
  'updater',
  'devtools',
  'overlay',
  'shell',
  'app'
] as const

type StudioNamespace = (typeof STUDIO_NAMESPACES)[number]

type AssertExtends<T, U extends T> = U

type _StudioKeysMatch = AssertExtends<keyof ITC, StudioNamespace>
type _StudioKeysComplete = AssertExtends<StudioNamespace, keyof ITC>
type _ScreenshotOnlyCapture = AssertExtends<keyof ITC['screenshot'], 'capture'>

void 0 as unknown as _StudioKeysMatch
void 0 as unknown as _StudioKeysComplete
void 0 as unknown as _ScreenshotOnlyCapture

describe('ipc contract', function () {
  it('exposes expected Studio namespaces', function () {
    expect(STUDIO_NAMESPACES).toEqual([
      'store',
      'dialog',
      'user',
      'sidecar',
      'doc',
      'screenshot',
      'updater',
      'devtools',
      'overlay',
      'shell',
      'app'
    ])
  })

  it('screenshot channel only has capture', function () {
    expect(Object.keys(CHANNELS.SCREENSHOT)).toEqual(['CAPTURE'])
    expect(CHANNELS.SCREENSHOT.CAPTURE).toBe('screenshot:capture')
  })

  it('preload mounts Studio namespaces', function () {
    const source = readFileSync(path.join(__dirname, '../preload.ts'), 'utf8')
    for (const name of STUDIO_NAMESPACES) {
      expect(source).toContain(`${name}:`)
    }
  })

  it('CHANNELS top-level domains cover Studio surface', function () {
    const channelDomains = Object.keys(CHANNELS).map(function (key) {
      if (key === 'USER') return 'user'
      return key.toLowerCase()
    })
    for (const name of STUDIO_NAMESPACES) {
      expect(channelDomains).toContain(name)
    }
  })
})
