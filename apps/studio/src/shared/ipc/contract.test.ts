import { describe, expect, it } from 'vitest'

import type { Api } from './api'
import type { Domain } from './channels'
import { CHANNELS, INVOKE_CHANNELS, PUSH_CHANNELS, flattenChannels } from './channels'
import { INVOKE_SPECS, PUSH_SPECS } from './specs'
import { DirectiveContentSchema } from './specs/sidecar'

type AssertExtends<T, U extends T> = U

/** Api 的顶层命名空间必须与 CHANNELS 的顶层域名（小写）双向一致 */
type _ApiKeysMatch = AssertExtends<keyof Api, Domain>
type _ApiKeysComplete = AssertExtends<Domain, keyof Api>

type _CaptureHasScreenshot = AssertExtends<keyof Api['capture'], 'screenshot'>
type _CaptureHasOpen = AssertExtends<keyof Api['capture'], 'open'>
type _ThroughHasUpdate = AssertExtends<keyof Api['through'], 'updateRects'>

/** 推送通道在 Api 上是订阅形态，不是 invoke 形态 */
type _UpdaterHasOnEvent = AssertExtends<keyof Api['updater'], 'onEvent'>
type _OverlayHasOnEvent = AssertExtends<keyof Api['overlay'], 'onEvent'>

void 0 as unknown as _ApiKeysMatch
void 0 as unknown as _ApiKeysComplete
void 0 as unknown as _CaptureHasScreenshot
void 0 as unknown as _CaptureHasOpen
void 0 as unknown as _ThroughHasUpdate
void 0 as unknown as _UpdaterHasOnEvent
void 0 as unknown as _OverlayHasOnEvent

describe('channel derivation', function () {
  it('flattens to exactly 89 channels', function () {
    // 83 + asset(6) = 89
    expect(flattenChannels()).toHaveLength(89)
  })

  it('splits invoke (85) from push (4) with no overlap', function () {
    expect(PUSH_CHANNELS).toHaveLength(4)
    expect(INVOKE_CHANNELS).toHaveLength(85)
    for (const push of PUSH_CHANNELS) {
      expect(INVOKE_CHANNELS).not.toContain(push)
    }
  })

  it('sorts invoke channels deterministically', function () {
    expect(INVOKE_CHANNELS).toEqual([...INVOKE_CHANNELS].sort())
  })

  it('freezes the wire format of representative channels', function () {
    expect(CHANNELS.STORE.READ).toBe('store:toRead')
    expect(CHANNELS.CAPTURE.SCREENSHOT).toBe('capture:screenshot')
    expect(CHANNELS.CAPTURE.OPEN).toBe('capture:open')
    expect(CHANNELS.CAPTURE.CLOSE).toBe('capture:close')
    expect(CHANNELS.CAPTURE.RECORDER).toBe('capture:recorder')
    expect(CHANNELS.ASSET.READ).toBe('asset:toRead')
    expect(CHANNELS.ASSET.PIN).toBe('asset:toPin')
    expect(CHANNELS.ASSET.EXPORT).toBe('asset:toExport')
    expect(CHANNELS.THROUGH.UPDATE_RECTS).toBe('through:updateRects')
    expect(CHANNELS.OVERLAY.EVENT).toBe('overlay:event')
    expect(CHANNELS.CHAT.PROVIDER.READ).toBe('chat:provider.toRead')
    expect(CHANNELS.CHAT.USAGE.READ).toBe('chat:usage.toRead')
    expect(CHANNELS.WINDOW.OPEN).toBe('window:toOpen')
    expect(CHANNELS.WORKSPACE.READ_FILE).toBe('workspace:readFile')
    expect(CHANNELS.MIRROR.READ).toBe('mirror:toRead')
    expect(CHANNELS.MIRROR.TILE.READ).toBe('mirror:tile.toRead')
    expect(CHANNELS.SIDECAR.RUN).toBe('sidecar:run')
    expect(CHANNELS.SIDECAR.DIRECTIVE).toBe('sidecar:directive')
    expect(CHANNELS.SIDECAR.SAVE).toBe('sidecar:saveDirective')
    expect(CHANNELS.SIDECAR.DELETE).toBe('sidecar:deleteDirective')
    expect(CHANNELS.SIDECAR.IMPORT).toBe('sidecar:importDirectives')
    expect(CHANNELS.SIDECAR.EDIT).toBe('sidecar:editDirective')
    expect(CHANNELS.SIDECAR.PROGRESS).toBe('sidecar:progress')
    expect(CHANNELS.ASSISTANT.PORT).toBe('assistant:port')
    expect(CHANNELS.UPDATER.EVENT).toBe('updater:event')
  })

  it('capture channel has screenshot open close recorder', function () {
    expect(Object.keys(CHANNELS.CAPTURE).sort()).toEqual([
      'CLOSE',
      'OPEN',
      'RECORDER',
      'SCREENSHOT'
    ])
  })
})

describe('spec parity', function () {
  it('invoke specs cover exactly the invoke channels', function () {
    expect(Object.keys(INVOKE_SPECS).sort()).toEqual([...INVOKE_CHANNELS].sort())
  })

  it('push specs cover exactly the push channels', function () {
    expect(Object.keys(PUSH_SPECS).sort()).toEqual([...PUSH_CHANNELS].sort())
  })
})

describe('corex directive contract', function () {
  it('accepts the current Rust schema shape without losing extension fields', function () {
    const fixture = {
      name: 'build',
      description: 'Build and publish',
      version: null,
      bucket: null,
      inputs: [{ name: 'target', required: true }],
      variables: { environment: 'production' },
      permissions: { shell: true },
      triggers: [
        {
          type: 'watch',
          paths: ['dist'],
          events: ['modify'],
          debounce: 'trailing',
          throttle: 'both'
        }
      ],
      steps: [
        {
          id: 'compile',
          action: 'shell.run',
          params: { command: 'pnpm build' }
        },
        {
          id: 'publish',
          parallel: [
            {
              id: 'upload',
              steps: [{ id: 'upload-step', action: 'file.copy' }]
            }
          ],
          max_concurrency: 2
        }
      ],
      future_field: { enabled: true }
    }

    const parsed = DirectiveContentSchema.parse(fixture)

    expect(parsed.version).toBe('')
    expect(parsed.bucket).toBeNull()
    expect(parsed.future_field).toEqual({ enabled: true })
  })
})
