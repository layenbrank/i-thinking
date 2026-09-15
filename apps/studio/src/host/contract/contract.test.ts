import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { CHANNELS, INVOKE_CHANNELS, PUSH_CHANNELS, flattenChannels } from '../../shared/ipc/channels'
import type { Domain } from '../../shared/ipc/channels'
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
  'chat',
  'assistant'
] as const

type StudioNamespace = (typeof STUDIO_NAMESPACES)[number]

type AssertExtends<T, U extends T> = U

type _StudioKeysMatch = AssertExtends<keyof ITC, StudioNamespace>
type _StudioKeysComplete = AssertExtends<StudioNamespace, keyof ITC>
type _ScreenshotOnlyCapture = AssertExtends<keyof ITC['screenshot'], 'capture'>

/** CHANNELS 顶层域名的小写形式必须与渲染侧命名空间集合完全一致 */
type _DomainMatch = AssertExtends<Domain, StudioNamespace>
type _DomainComplete = AssertExtends<StudioNamespace, Domain>

void 0 as unknown as _StudioKeysMatch
void 0 as unknown as _StudioKeysComplete
void 0 as unknown as _ScreenshotOnlyCapture
void 0 as unknown as _DomainMatch
void 0 as unknown as _DomainComplete

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
      'chat',
      'assistant'
    ])
  })

  it('screenshot channel only has capture', function () {
    expect(Object.keys(CHANNELS.SCREENSHOT)).toEqual(['CAPTURE'])
    expect(CHANNELS.SCREENSHOT.CAPTURE).toBe('screenshot:capture')
  })

  it('preload mounts Studio namespaces', function () {
    const source = readFileSync(path.join(__dirname, '../../preload.ts'), 'utf8')
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

describe('channel derivation', function () {
  it('flattens to exactly 40 channels', function () {
    expect(flattenChannels()).toHaveLength(40)
  })

  it('splits invoke (38) from push (2) with no overlap', function () {
    expect(PUSH_CHANNELS).toHaveLength(2)
    expect(INVOKE_CHANNELS).toHaveLength(38)
    for (const push of PUSH_CHANNELS) {
      expect(INVOKE_CHANNELS).not.toContain(push)
    }
  })

  it('sorts invoke channels deterministically', function () {
    expect(INVOKE_CHANNELS).toEqual([...INVOKE_CHANNELS].sort())
  })

  it('freezes the wire format of representative channels', function () {
    expect(CHANNELS.STORE.READ).toBe('store:toRead')
    expect(CHANNELS.SCREENSHOT.CAPTURE).toBe('screenshot:capture')
    expect(CHANNELS.CHAT.PROVIDER.READ).toBe('chat:provider.toRead')
    expect(CHANNELS.ASSISTANT.PORT).toBe('assistant:port')
    expect(CHANNELS.UPDATER.EVENT).toBe('updater:event')
  })
})
