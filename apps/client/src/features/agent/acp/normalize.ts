/**
 * session/update → NormalizedChunk（ACP SDK 1.3）
 */
import type { SessionNotification } from '@agentclientprotocol/sdk'

import type { NormalizedChunk } from '@/features/agent/types'

interface ParsedUsage {
  used: number
  size: number
}

function parseAcpUsageUpdate(params: SessionNotification): ParsedUsage | null {
  const update = params.update
  if (update.sessionUpdate !== 'usage_update') return null
  if (typeof update.used !== 'number' || typeof update.size !== 'number') return null
  return { used: update.used, size: update.size }
}

function parseAcpSessionUpdate(params: SessionNotification): NormalizedChunk | null {
  const update = params.update
  switch (update.sessionUpdate) {
    case 'agent_message_chunk': {
      if (update.content.type !== 'text' || !update.content.text) return null
      return { content: update.content.text }
    }
    case 'agent_thought_chunk': {
      if (update.content.type !== 'text' || !update.content.text) return null
      return { thinking: update.content.text }
    }
    case 'tool_call':
      return {
        thinking: `\n[tool:${update.status || 'pending'}] ${update.title.trim() || '工具调用'}\n`
      }
    case 'tool_call_update':
      return {
        thinking: `\n[tool:${update.status || 'pending'}] ${update.title?.trim() || '工具调用'}\n`
      }
    case 'usage_update':
      return null
    default:
      return null
  }
}

export { parseAcpSessionUpdate, parseAcpUsageUpdate }
export type { ParsedUsage }
