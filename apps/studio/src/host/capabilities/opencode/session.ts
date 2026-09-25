import path from 'node:path'

import type { StartRequest } from '../assistant-protocol'

/**
 * studio 会话 → opencode 会话的映射，以及「这次该发什么」的推导。
 *
 * 两条链路的历史策略不同，这是换引擎时最容易出错的地方：
 * - 渲染层每轮**发全量线程**（assistant-ui 给的就是整份 messages）；
 * - opencode 服务端**自己持历史**，`session.prompt` 只该收到新消息。
 *
 * 所以这里按「已经转发过多少条」做增量切分，并把条数持久化 —— 不持久化的话，
 * 重启后第一轮会把整段历史当成新消息重发，模型会看到重复的用户提问。
 *
 * v2 的 prompt 入参是**扁平**的 `{ text, files }`（v1 是 `parts` 数组），图片与路径引用
 * 走同一个 `files`：图片用 data URL，路径引用用 `file://` 绝对地址，opencode 自己读文件
 * 内容（`docs-attachments`：文本文件把「文件名 + 解码后的正文」给模型）。
 *
 * 纯函数（`planPrompt` / `toPromptFiles`）与存储（`SessionStore`）分开，前者可单测。
 */

/** 一个 studio 会话对应的 opencode 会话 */
interface SessionMapping {
  sessionID: string
  /** 已经转发给 opencode 的消息条数（按渲染层那份全量数组计） */
  messageCount: number
}

/** opencode v2 prompt 的附件条目 */
interface PromptFile {
  uri: string
  name: string
}

/** 渲染层发来的消息（与 `assistant-protocol` 的 `MessageSchema` 同形） */
interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: readonly string[]
  images?: ReadonlyArray<{ mediaType: string; data: string }>
}

interface PromptPlan {
  text: string
  files: PromptFile[]
  /** 下次该从这个条数继续切分 */
  nextCount: number
}

/** 引用条数与单条长度的上限：与协议层的校验保持一致 */
const MAX_REFERENCES = 32
const MAX_REFERENCE_CHARS = 1024

/**
 * 引用必须是工作区内的**相对路径**：`attachments` 由渲染进程给出（不可信输入），
 * 而 opencode 读附件不经过 `external_directory` 审批 —— 放行 `../../` 就等于放行
 * 「读任意文件」。所以这里只接受干净的相对路径，其余一律丢弃。
 */
function toWorkspaceRelative(value: string): string | null {
  const normalized = value.trim().replace(/\\/g, '/').slice(0, MAX_REFERENCE_CHARS)
  if (!normalized) return null
  if (normalized.startsWith('/')) return null
  if (/^[a-zA-Z]:/.test(normalized)) return null
  if (normalized.split('/').includes('..')) return null
  return normalized
}

/** 图片统一成 data URL：渲染层给的可能已经是 data URL，也可能只是裸 base64 */
function toImageFile(image: { mediaType: string; data: string }, index: number): PromptFile {
  const isDataUrl = image.data.startsWith('data:')
  return {
    uri: isDataUrl ? image.data : `data:${image.mediaType};base64,${image.data}`,
    name: `image-${index + 1}`
  }
}

/** 一条消息 → opencode 的 `files`：图片（内联内容）+ 路径引用（服务端自己读） */
function toPromptFiles(message: PromptMessage, directory: string): PromptFile[] {
  const files: PromptFile[] = []

  for (const [index, image] of (message.images ?? []).entries()) {
    files.push(toImageFile(image, index))
  }

  const seen = new Set<string>()
  for (const raw of (message.attachments ?? []).slice(0, MAX_REFERENCES)) {
    const relative = toWorkspaceRelative(raw)
    if (!relative || seen.has(relative)) continue
    seen.add(relative)
    files.push({
      // `path.resolve` 之后再编码：Windows 盘符要变成 `/C:/…` 才是合法的 file URL
      uri: `file:///${path.resolve(directory, relative).replace(/\\/g, '/').replace(/^\/+/, '')}`,
      name: relative
    })
  }

  return files
}

/** 从尾部往前找最后一条用户消息：没有新增时用它重发（重试/重新生成） */
function findLastUserMessage(messages: readonly PromptMessage[]): PromptMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return messages[index]
  }
  return null
}

/**
 * 工作区根清单：只在**首轮**贴一次。
 *
 * opencode 的会话只有一个工作目录，工作区里的其它根在它眼里都是「工作区外」。不告诉它
 * 这些根在哪儿，模型面对「看看 service 目录」这种话就只能从盘符根开始全盘搜（费 token，
 * 而且答案很可能不是用户想指的那棵树）。后续轮次不再重复：opencode 自己的历史里已经有了。
 */
function toRootsPreamble(roots: readonly string[], directory: string): string {
  const current = path.resolve(directory)
  const extras = roots.filter(function (root) {
    return path.resolve(root) !== current
  })
  if (extras.length === 0) return ''
  return [
    '【工作区根目录】本工作区有多个根目录，除当前工作目录外还有下列根目录，它们都允许直接读写，不必从盘符根开始搜索：',
    ...roots.map(function (root) {
      return path.resolve(root) === current ? `- ${root}（当前工作目录）` : `- ${root}`
    }),
    '回答与检索都优先在这些根目录内进行。',
    ''
  ].join('\n')
}

/**
 * 推导本次该发的内容。
 *
 * `mapping` 为 null（首轮，或映射丢失）时只发**最后一条**用户消息 —— 之前的助手回复
 * 是上一次运行的结果，opencode 这边没有它们，硬重放会让模型看到自己没说过的话。
 * 同一时刻也是贴工作区根清单的时机（见 `toRootsPreamble`）。
 *
 * 没有新增用户消息时重发最后一条：用户点了「重新生成」或上一轮失败后重试，
 * 此时必须产生一次新的运行，而不是静默什么都不做。
 */
function planPrompt(
  messages: readonly PromptMessage[],
  mapping: SessionMapping | null,
  directory: string,
  roots: readonly string[] = []
): PromptPlan {
  const hasMapping = mapping !== null
  // 线程被改短（删消息/分支）时按「映射失效」处理，重新从尾部取
  const from =
    hasMapping && mapping.messageCount >= 0 && mapping.messageCount <= messages.length
      ? mapping.messageCount
      : messages.length

  const fresh = messages.slice(from).filter(function (message) {
    return message.role === 'user'
  })
  const chosen = fresh.length > 0 ? fresh[fresh.length - 1] : findLastUserMessage(messages)
  const preamble = hasMapping ? '' : toRootsPreamble(roots, directory)

  return {
    text: chosen ? `${preamble}${chosen.content}` : '',
    files: chosen ? toPromptFiles(chosen, directory) : [],
    nextCount: messages.length
  }
}

/** 会话标题：取首条用户消息的前若干字，让 opencode 的会话列表可读 */
function toSessionTitle(request: StartRequest): string {
  const first = request.messages.find(function (message) {
    return message.role === 'user' && message.content.length > 0
  })
  const raw = first?.content.trim().replace(/\s+/g, ' ') ?? ''
  if (!raw) return `studio-${request.runID.slice(0, 8)}`
  return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw
}

/**
 * 映射的持久化。用 electron-store（明文）—— 里面只有 opencode 的会话 id，
 * 不含任何凭据，与 `opencode-sessions` 这个独立文件对应。
 */
interface MappingStore {
  toRead: () => Record<string, unknown>
  toWrite: (value: Record<string, unknown>) => void
}

class SessionStore {
  private readonly store: MappingStore

  constructor(store: MappingStore) {
    this.store = store
  }

  find(threadID: string): SessionMapping | null {
    const value = this.store.toRead()[threadID]
    if (typeof value !== 'object' || value === null) return null

    const record = value as Record<string, unknown>
    const sessionID = record.sessionID
    const messageCount = record.messageCount
    if (typeof sessionID !== 'string' || sessionID.length === 0) return null
    if (typeof messageCount !== 'number' || !Number.isFinite(messageCount)) return null

    return { sessionID, messageCount }
  }

  toWrite(threadID: string, mapping: SessionMapping): void {
    this.store.toWrite({ ...this.store.toRead(), [threadID]: mapping })
  }

  toRemove(threadID: string): void {
    const next = { ...this.store.toRead() }
    delete next[threadID]
    this.store.toWrite(next)
  }
}

export { findLastUserMessage, planPrompt, SessionStore, toPromptFiles, toSessionTitle }
export type { MappingStore, PromptFile, PromptMessage, PromptPlan, SessionMapping }
