/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createChromiumItc, openTab } from './itc-chromium'

describe('itc-chromium', function () {
  afterEach(function () {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('persists store values in localStorage', async function () {
    const itc = createChromiumItc()
    await itc.store.toWrite({ key: 'theme', value: { mode: 'dark' } })
    expect(await itc.store.has({ key: 'theme' })).toBe(true)
    expect(await itc.store.toRead({ key: 'theme' })).toEqual({ mode: 'dark' })
    expect(await itc.store.keys()).toContain('theme')
    await itc.store.toRemove({ key: 'theme' })
    expect(await itc.store.has({ key: 'theme' })).toBe(false)
  })

  it('opens tabs via chrome.send when available', async function () {
    const send = vi.fn()
    vi.stubGlobal('chrome', { send })
    const itc = createChromiumItc()
    await itc.shell.open({ url: 'https://example.com' })
    expect(send).toHaveBeenCalledWith('openTab', ['https://example.com'])
  })

  it('falls back to window.open', function () {
    const open = vi.spyOn(window, 'open').mockImplementation(function () {
      return null
    })
    openTab('https://example.com/fallback')
    expect(open).toHaveBeenCalledWith(
      'https://example.com/fallback',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('returns overlay stub', async function () {
    const itc = createChromiumItc()
    expect(await itc.overlay.toRead()).toEqual({ visible: false })
  })
})
