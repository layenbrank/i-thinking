import { describe, expect, it } from 'vitest'
import { isAllowedPageUrl } from './trusted-sender'
import type { AppContext } from '../app-context'

function stubCtx(partial: Partial<AppContext> & Pick<AppContext, 'isDev'>): AppContext {
  const origins = partial.findAllowedOrigins?.() ?? []
  return {
    app: {} as AppContext['app'],
    ipc: {} as AppContext['ipc'],
    isDev: partial.isDev,
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() {
        return this
      }
    },
    findWindow() {
      return null
    },
    setWindow() {},
    trustWebContents() {},
    untrustWebContents() {},
    isTrustedWebContents() {
      return true
    },
    findAllowedOrigins() {
      return origins
    },
    setAllowedOrigins() {},
    ...partial
  }
}

describe('isAllowedPageUrl', function () {
  it('dev: matches configured vite origin', function () {
    const ctx = stubCtx({
      isDev: true,
      findAllowedOrigins() {
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
