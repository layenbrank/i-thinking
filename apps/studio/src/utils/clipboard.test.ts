import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyText } from './clipboard'

afterEach(function () {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('copyText', function () {
  it('uses navigator.clipboard when it works', async function () {
    const writeText = vi.fn(async function () {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyText('hello')

    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to execCommand when clipboard.writeText rejects', async function () {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async function () {
          throw new Error('denied')
        }
      }
    })

    const area = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn()
    }
    const body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
    const execCommand = vi.fn(function () {
      return true
    })
    vi.stubGlobal('document', {
      body,
      createElement: function () {
        return area
      },
      execCommand
    })

    await copyText('fallback')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(body.appendChild).toHaveBeenCalledWith(area)
    expect(body.removeChild).toHaveBeenCalledWith(area)
    expect(area.value).toBe('fallback')
  })
})
