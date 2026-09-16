import { describe, expect, it } from 'vitest'

import type { Api } from './api'
import type { Domain } from './channels'
import { CHANNELS, INVOKE_CHANNELS, PUSH_CHANNELS, flattenChannels } from './channels'
import { INVOKE_SPECS, PUSH_SPECS } from './specs'

type AssertExtends<T, U extends T> = U

/** Api 的顶层命名空间必须与 CHANNELS 的顶层域名（小写）双向一致 */
type _ApiKeysMatch = AssertExtends<keyof Api, Domain>
type _ApiKeysComplete = AssertExtends<Domain, keyof Api>

/** 抽一个域做形状样本：screenshot 只有一个频道 */
type _ScreenshotOnlyCapture = AssertExtends<keyof Api['screenshot'], 'capture'>

/** 推送通道在 Api 上是订阅形态，不是 invoke 形态 */
type _UpdaterHasOnEvent = AssertExtends<keyof Api['updater'], 'onEvent'>

void 0 as unknown as _ApiKeysMatch
void 0 as unknown as _ApiKeysComplete
void 0 as unknown as _ScreenshotOnlyCapture
void 0 as unknown as _UpdaterHasOnEvent

describe('channel derivation', function () {
  it('flattens to exactly 58 channels', function () {
    expect(flattenChannels()).toHaveLength(58)
  })

  it('splits invoke (56) from push (2) with no overlap', function () {
    expect(PUSH_CHANNELS).toHaveLength(2)
    expect(INVOKE_CHANNELS).toHaveLength(56)
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
    expect(CHANNELS.WINDOW.AGENT.OPEN).toBe('window:agent.toOpen')
    expect(CHANNELS.WORKSPACE.READ_FILE).toBe('workspace:readFile')
    expect(CHANNELS.ASSISTANT.PORT).toBe('assistant:port')
    expect(CHANNELS.UPDATER.EVENT).toBe('updater:event')
  })

  it('screenshot channel only has capture', function () {
    expect(Object.keys(CHANNELS.SCREENSHOT)).toEqual(['CAPTURE'])
  })
})

describe('spec parity', function () {
  // 编译期已由 specs/index.ts 的 _SpecsMissing/_SpecsExtra 保证；
  // 这里补一条运行时镜像，防止断言被误删后无人察觉
  it('invoke specs cover exactly the invoke channels', function () {
    expect(Object.keys(INVOKE_SPECS).sort()).toEqual([...INVOKE_CHANNELS].sort())
  })

  it('push specs cover exactly the push channels', function () {
    expect(Object.keys(PUSH_SPECS).sort()).toEqual([...PUSH_CHANNELS].sort())
  })
})
