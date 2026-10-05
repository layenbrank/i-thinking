import { afterEach, describe, expect, it, vi } from 'vitest'

import { dropJobsCache, isAlive, waitUntilDead } from './use-guard-run'

afterEach(function () {
  dropJobsCache()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('waitUntilDead', function () {
  it('supervisor 已退出时立刻为 true', async function () {
    vi.stubGlobal('itc', {
      sidecar: {
        jobs: async function () {
          return { jobs: [] }
        }
      }
    })
    await expect(waitUntilDead('watch', 'demo')).resolves.toBe(true)
  })

  it('活着时会轮询直到死去', async function () {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal('itc', {
      sidecar: {
        jobs: async function () {
          calls += 1
          return {
            jobs:
              calls < 3
                ? [{ kind: 'watch', name: 'demo', id: '1', pid: 1, is_alive: true, directive_path: 'x' }]
                : []
          }
        }
      }
    })
    const pending = waitUntilDead('watch', 'demo')
    await vi.advanceTimersByTimeAsync(400)
    await expect(pending).resolves.toBe(true)
    expect(calls).toBeGreaterThanOrEqual(3)
  })
})

describe('isAlive', function () {
  it('只认同名同 kind 且还活着', function () {
    expect(
      isAlive(
        [{ kind: 'watch', name: 'demo', id: '1', pid: 1, is_alive: true, directive_path: 'x' }],
        'watch',
        'demo'
      )
    ).toBe(true)
    expect(
      isAlive(
        [{ kind: 'watch', name: 'demo', id: '1', pid: 1, is_alive: false, directive_path: 'x' }],
        'watch',
        'demo'
      )
    ).toBe(false)
    expect(
      isAlive(
        [{ kind: 'cron', name: 'demo', id: '1', pid: 1, is_alive: true, directive_path: 'x' }],
        'watch',
        'demo'
      )
    ).toBe(false)
  })
})
