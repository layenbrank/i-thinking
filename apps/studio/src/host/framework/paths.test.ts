import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findAppRoot, findBundleDir } from './paths'

describe('main paths', function () {
  const originalArgv1 = process.argv[1]
  const originalAppRoot = process.env.APP_ROOT

  afterEach(function () {
    process.argv[1] = originalArgv1
    if (originalAppRoot === undefined) {
      Reflect.deleteProperty(process.env, 'APP_ROOT')
    } else {
      process.env.APP_ROOT = originalAppRoot
    }
  })

  it('findBundleDir uses absolute argv entry', function () {
    process.argv[1] = 'D:\\app\\.vite\\build\\main.js'
    expect(findBundleDir()).toBe(path.normalize('D:\\app\\.vite\\build'))
  })

  it('findAppRoot prefers APP_ROOT', function () {
    process.env.APP_ROOT = 'D:\\studio'
    expect(findAppRoot()).toBe('D:\\studio')
  })
})
