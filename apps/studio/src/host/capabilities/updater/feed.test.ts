import { afterEach, describe, expect, it } from 'vitest'

import { findFeedUrl, hasSquirrelFirstRun } from './feed'

const KEYS = ['STUDIO_UPDATE_FEED_URL', 'STUDIO_UPDATE_URL', 'STUDIO_S3_UPDATE_BASE'] as const

afterEach(function () {
  for (const key of KEYS) {
    delete process.env[key]
  }
})

describe('findFeedUrl', function () {
  it('prefers the baked feed url', function () {
    process.env.STUDIO_UPDATE_FEED_URL = 'https://cdn.example/win32/x64/'
    process.env.STUDIO_UPDATE_URL = 'https://other.example/feed'
    expect(findFeedUrl()).toBe('https://cdn.example/win32/x64')
  })

  it('falls back to STUDIO_UPDATE_URL', function () {
    process.env.STUDIO_UPDATE_URL = 'https://updates.example/studio/'
    expect(findFeedUrl()).toBe('https://updates.example/studio')
  })

  it('derives win32/x64 from S3 base', function () {
    process.env.STUDIO_S3_UPDATE_BASE = 'https://bucket.example/studio'
    expect(findFeedUrl()).toBe('https://bucket.example/studio/win32/x64')
  })

  it('returns undefined when unset', function () {
    expect(findFeedUrl()).toBeUndefined()
  })
})

describe('hasSquirrelFirstRun', function () {
  it('detects the installer first-run flag', function () {
    expect(hasSquirrelFirstRun(['i-thinking.exe', '--squirrel-firstrun'])).toBe(true)
    expect(hasSquirrelFirstRun(['i-thinking.exe'])).toBe(false)
  })
})
