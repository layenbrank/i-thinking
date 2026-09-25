import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ARCHIVED_OPEN,
  STORAGE_KEY,
  findSidebarState,
  parseSidebarState,
  writeSidebarState
} from '@/views/agent/chat/components/sidebar-expansion.ts'

/**
 * 存储里只该有「用户表过态的键」：默认展开不是靠写 `true` 进去，而是靠**没有这个键**。
 * 一旦把默认值写进存储，之后新建的工作区就会带着折叠状态出现。
 */

function createStorage(store: Map<string, string>): Storage {
  return {
    getItem: function (key: string) {
      return store.get(key) ?? null
    },
    setItem: function (key: string, value: string) {
      store.set(key, value)
    },
    removeItem: function (key: string) {
      store.delete(key)
    }
  } as unknown as Storage
}

const storage = new Map<string, string>()

beforeEach(function () {
  storage.clear()
  vi.stubGlobal('localStorage', createStorage(storage))
  vi.spyOn(console, 'warn').mockImplementation(function () {})
})

describe('parseSidebarState', function () {
  it('falls back to all-expanded and a collapsed archive section', function () {
    expect(parseSidebarState(null)).toEqual({ expanded: {}, archivedOpen: ARCHIVED_OPEN })
  })

  it('keeps explicit boolean choices', function () {
    const state = parseSidebarState(
      JSON.stringify({ expanded: { 'ws-a': false, 'ws-b': true }, archivedOpen: true })
    )
    expect(state).toEqual({ expanded: { 'ws-a': false, 'ws-b': true }, archivedOpen: true })
  })

  it('drops non-boolean values instead of trusting them', function () {
    const state = parseSidebarState(
      JSON.stringify({ expanded: { 'ws-a': 'false', 'ws-b': 0, 'ws-c': true } })
    )
    expect(state.expanded).toEqual({ 'ws-c': true })
  })

  it('recovers from a damaged archive', function () {
    expect(parseSidebarState('{ not json').expanded).toEqual({})
    expect(parseSidebarState('[1,2]').expanded).toEqual({})
  })
})

describe('sidebar state round trip', function () {
  it('persists only the keys the user touched', function () {
    writeSidebarState({ expanded: { 'ws-a': false }, archivedOpen: true })

    expect(findSidebarState()).toEqual({ expanded: { 'ws-a': false }, archivedOpen: true })
    expect(JSON.parse(storage.get(STORAGE_KEY) ?? '')?.expanded).toEqual({ 'ws-a': false })
  })

  it('survives a storage that was never written', function () {
    expect(findSidebarState()).toEqual({ expanded: {}, archivedOpen: ARCHIVED_OPEN })
  })
})
