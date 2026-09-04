import { describe, expect, it } from 'vitest'

import type { Context } from './context'
import { isAllowedPageUrl } from './trusted-sender'

function stubCtx(partial: Partial<Context> & Pick<Context, 'isDev'>): Context {
  return {
    app: {} as Context['app'],
    ipc: {} as Context['ipc'],
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() {
        return this
      }
    },
    corex: {} as Context['corex'],
    toReadWindow() {
      return null
    },
    toUpdateWindow() {},
    trustWebContents() {},
    untrustWebContents() {},
    isTrustedWebContents() {
      return true
    },
    toReadOrigins() {
      return []
    },
    toUpdateOrigins() {},
    ...partial
  }
}

describe('isAllowedPageUrl', function () {
  it('dev: matches configured vite origin', function () {
    const ctx = stubCtx({
      isDev: true,
      toReadOrigins() {
        return ['http://localhost:5173']
      }
    })
    expect(isAllowedPageUrl(ctx, 'http://localhost:5173/')).toBe(true)
    expect(isAllowedPageUrl(ctx, 'http://localhost:5173/index.html')).toBe(true)
    expect(isAllowedPageUrl(ctx, 'http://evil.com/')).toBe(false)
    expect(isAllowedPageUrl(ctx, 'file:///tmp/x')).toBe(false)
  })

  it('prod: only file protocol', function () {
    const ctx = stubCtx({ isDev: false })
    expect(isAllowedPageUrl(ctx, 'file:///app/index.html')).toBe(true)
    expect(isAllowedPageUrl(ctx, 'http://localhost:5173/')).toBe(false)
  })
})
