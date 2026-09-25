// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThreadWelcome } from '@/views/agent/chat/components/welcome.tsx'

const identity = vi.hoisted(function () {
  return { sessionID: null as string | null }
})

vi.mock('@/features/chat/session.ts', function () {
  return {
    useSessionID: function () {
      return identity.sessionID
    }
  }
})

vi.mock('@/features/agent/workspace/client.ts', function () {
  return {
    useActiveWorkspace: function () {
      return null
    }
  }
})

vi.mock('@assistant-ui/react', function () {
  return {
    useAui: function () {
      return { composer: { setText: function () {}, send: function () {} } }
    }
  }
})

describe('ThreadWelcome', function () {
  beforeEach(function () {
    identity.sessionID = null
  })

  afterEach(function () {
    cleanup()
  })

  it('新会话没有 remoteId，摆欢迎页', function () {
    render(<ThreadWelcome />)

    expect(screen.getByText('有什么可以帮你的？')).toBeInTheDocument()
    expect(screen.queryByText('这个会话没有历史消息')).not.toBeInTheDocument()
  })

  it('老会话读不出历史时，明说没有历史而不是摆欢迎页', function () {
    identity.sessionID = 'a36e831f-a74c-4d64-aee3-509569522fd7'

    render(<ThreadWelcome />)

    expect(screen.getByText('这个会话没有历史消息')).toBeInTheDocument()
    expect(screen.queryByText('有什么可以帮你的？')).not.toBeInTheDocument()
  })
})
