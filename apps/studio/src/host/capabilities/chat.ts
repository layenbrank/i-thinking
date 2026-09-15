import { randomUUID } from 'node:crypto'

import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { chatMessage, chatProvider, chatSession } from '../../../drizzle/schema'
import { CHANNELS } from '../contract/channels'
import type { Context } from '../framework/context'
import { findClient } from './database'
import { registerHandler } from '../framework/handle'
import type { Plugin } from '../framework/module'

/**
 * Chat 域：会话 / 消息 / provider 的仓储 IPC。
 *
 * 消息的 `format` + `content` 由渲染进程的 MessageFormatAdapter 产出（见 drizzle/schema/chat.ts），
 * 主进程只做存取与顺序保证，不解析内容；因此这里没有"消息结构"类型的耦合。
 */

interface ProviderReadR {
  id: string
  kind: string
  name: string
  baseUrl: string | null
  models: string[] | null
  model: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface ProviderWriteP {
  kind: string
  name: string
  baseUrl?: string | null
  models?: string[] | null
  model?: string | null
  enabled?: boolean
}

interface ProviderUpdateP extends Partial<ProviderWriteP> {
  id: string
}

interface SessionReadR {
  id: string
  title: string
  pinned: boolean
  providerID: string | null
  createdAt: string
  updatedAt: string
}

interface SessionWriteP {
  title?: string
  providerID?: string | null
}

interface SessionUpdateP extends Partial<SessionWriteP> {
  id: string
  pinned?: boolean
}

interface MessageReadR {
  id: string
  sessionID: string
  parentID: string | null
  format: string
  content: string
  createdAt: string
  updatedAt: string
}

interface MessageReadP {
  sessionID: string
}

interface MessageAppendP {
  id?: string
  sessionID: string
  parentID?: string | null
  format: string
  content: string
}

interface MessageUpdateP {
  id: string
  format?: string
  content?: string
}

interface RemoveP {
  id: string
}

const NullableUrl = z.union([z.string().url(), z.literal('')]).nullish()

const ProviderWriteSchema = z.object({
  kind: z.string().min(1),
  name: z.string().min(1),
  baseUrl: NullableUrl,
  models: z.array(z.string()).nullish(),
  model: z.string().nullish(),
  enabled: z.boolean().optional()
})

const ProviderUpdateSchema = ProviderWriteSchema.partial().extend({
  id: z.uuid()
})

const SessionWriteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  providerID: z.uuid().nullish()
})

const SessionUpdateSchema = SessionWriteSchema.extend({
  id: z.uuid(),
  pinned: z.boolean().optional()
})

const MessageReadSchema = z.object({
  sessionID: z.uuid()
})

const MessageAppendSchema = z.object({
  id: z.uuid().optional(),
  sessionID: z.uuid(),
  parentID: z.uuid().nullish(),
  format: z.string().min(1),
  content: z.string()
})

const MessageUpdateSchema = z.object({
  id: z.uuid(),
  format: z.string().min(1).optional(),
  content: z.string().optional()
})

const RemoveSchema = z.object({
  id: z.uuid()
})

/** `models` 在 API 侧是数组，落库是 JSON 文本 */
function parseModels(value: string | null): string[] | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as string[]) : null
  } catch {
    return null
  }
}

function toProvider(row: {
  id: string
  kind: string
  name: string
  baseUrl: string | null
  models: string | null
  model: string | null
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}): ProviderReadR {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    baseUrl: row.baseUrl,
    models: parseModels(row.models),
    model: row.model,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

function toSession(row: {
  id: string
  title: string
  pinned: boolean
  providerID: string | null
  createdAt: Date
  updatedAt: Date
}): SessionReadR {
  return {
    id: row.id,
    title: row.title,
    pinned: row.pinned,
    providerID: row.providerID,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

function toMessage(row: {
  id: string
  sessionID: string
  parentID: string | null
  format: string
  content: string
  createdAt: Date
  updatedAt: Date
}): MessageReadR {
  return {
    id: row.id,
    sessionID: row.sessionID,
    parentID: row.parentID,
    format: row.format,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/** provider 写库值；`models` 数组序列化为 JSON 文本 */
function toProviderValues(input: ProviderWriteP) {
  return {
    kind: input.kind,
    name: input.name,
    baseUrl: input.baseUrl ? input.baseUrl : null,
    models: input.models ? JSON.stringify(input.models) : null,
    model: input.model ?? null,
    enabled: input.enabled ?? true
  }
}

class Repository {
  async findProviders(): Promise<ProviderReadR[]> {
    const rows = await findClient().select().from(chatProvider).orderBy(chatProvider.name)
    return rows.map(toProvider)
  }

  async findProvider(id: string): Promise<ProviderReadR | null> {
    const rows = await findClient().select().from(chatProvider).where(eq(chatProvider.id, id)).limit(1)
    return rows.length === 0 ? null : toProvider(rows[0])
  }

  async writeProvider(input: ProviderWriteP): Promise<ProviderReadR> {
    const now = new Date()
    const rows = await findClient()
      .insert(chatProvider)
      .values({ id: randomUUID(), ...toProviderValues(input), createdAt: now, updatedAt: now })
      .returning()
    return toProvider(rows[0])
  }

  async updateProvider(input: ProviderUpdateP): Promise<ProviderReadR> {
    const rows = await findClient()
      .update(chatProvider)
      .set({
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl ? input.baseUrl : null } : {}),
        ...(input.models !== undefined
          ? { models: input.models ? JSON.stringify(input.models) : null }
          : {}),
        ...(input.model !== undefined ? { model: input.model ?? null } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        updatedAt: new Date()
      })
      .where(eq(chatProvider.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] provider 不存在: ${input.id}`)
    return toProvider(rows[0])
  }

  /** 会话的 default provider 引用为 set null，故删 provider 不会连带删会话 */
  async removeProvider(input: RemoveP): Promise<void> {
    const rows = await findClient()
      .delete(chatProvider)
      .where(eq(chatProvider.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] provider 不存在: ${input.id}`)
  }

  /** 置顶优先，其次最近更新 */
  async findSessions(): Promise<SessionReadR[]> {
    const rows = await findClient()
      .select()
      .from(chatSession)
      .orderBy(desc(chatSession.pinned), desc(chatSession.updatedAt))
    return rows.map(toSession)
  }

  async writeSession(input: SessionWriteP): Promise<SessionReadR> {
    const now = new Date()
    const rows = await findClient()
      .insert(chatSession)
      .values({
        id: randomUUID(),
        title: input.title ?? '新会话',
        providerID: input.providerID ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
    return toSession(rows[0])
  }

  async updateSession(input: SessionUpdateP): Promise<SessionReadR> {
    const rows = await findClient()
      .update(chatSession)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        ...(input.providerID !== undefined ? { providerID: input.providerID ?? null } : {}),
        updatedAt: new Date()
      })
      .where(eq(chatSession.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] session 不存在: ${input.id}`)
    return toSession(rows[0])
  }

  async removeSession(input: RemoveP): Promise<void> {
    const rows = await findClient()
      .delete(chatSession)
      .where(eq(chatSession.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] session 不存在: ${input.id}`)
  }

  /** 按时间升序返回整条会话（分支关系由 parentID 表达） */
  async findMessages(input: MessageReadP): Promise<MessageReadR[]> {
    const rows = await findClient()
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.sessionID, input.sessionID))
      .orderBy(chatMessage.createdAt)
    return rows.map(toMessage)
  }

  /** 追加一条消息并顺带推进会话的 updatedAt（会话列表按最近活动排序） */
  async appendMessage(input: MessageAppendP): Promise<MessageReadR> {
    const now = new Date()
    const client = findClient()
    const rows = await client
      .insert(chatMessage)
      .values({
        id: input.id ?? randomUUID(),
        sessionID: input.sessionID,
        parentID: input.parentID ?? null,
        format: input.format,
        content: input.content,
        createdAt: now,
        updatedAt: now
      })
      .returning()
    await client
      .update(chatSession)
      .set({ updatedAt: now })
      .where(eq(chatSession.id, input.sessionID))
    return toMessage(rows[0])
  }

  async updateMessage(input: MessageUpdateP): Promise<MessageReadR> {
    const rows = await findClient()
      .update(chatMessage)
      .set({
        ...(input.format !== undefined ? { format: input.format } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        updatedAt: new Date()
      })
      .where(eq(chatMessage.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] message 不存在: ${input.id}`)
    return toMessage(rows[0])
  }

  /** 自引用外键为 cascade：删除一条消息会连带删除其后继分支 */
  async removeMessage(input: RemoveP): Promise<void> {
    const rows = await findClient()
      .delete(chatMessage)
      .where(eq(chatMessage.id, input.id))
      .returning()
    if (rows.length === 0) throw new Error(`[CHAT] message 不存在: ${input.id}`)
  }
}

function buildPlugin(): Plugin {
  const chat = new Repository()
  return {
    name: 'chat',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.CHAT.PROVIDER.READ, null, function () {
        return chat.findProviders()
      })
      registerHandler(ctx, CHANNELS.CHAT.PROVIDER.WRITE, ProviderWriteSchema, function (input) {
        return chat.writeProvider(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.PROVIDER.UPDATE, ProviderUpdateSchema, function (input) {
        return chat.updateProvider(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.PROVIDER.REMOVE, RemoveSchema, function (input) {
        return chat.removeProvider(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.SESSION.READ, null, function () {
        return chat.findSessions()
      })
      registerHandler(ctx, CHANNELS.CHAT.SESSION.WRITE, SessionWriteSchema, function (input) {
        return chat.writeSession(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.SESSION.UPDATE, SessionUpdateSchema, function (input) {
        return chat.updateSession(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.SESSION.REMOVE, RemoveSchema, function (input) {
        return chat.removeSession(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.MESSAGE.READ, MessageReadSchema, function (input) {
        return chat.findMessages(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.MESSAGE.APPEND, MessageAppendSchema, function (input) {
        return chat.appendMessage(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.MESSAGE.UPDATE, MessageUpdateSchema, function (input) {
        return chat.updateMessage(input)
      })
      registerHandler(ctx, CHANNELS.CHAT.MESSAGE.REMOVE, RemoveSchema, function (input) {
        return chat.removeMessage(input)
      })
      ctx.logger.child('chat').info('registered')
    }
  }
}

export {
  buildPlugin,
  ProviderWriteSchema,
  ProviderUpdateSchema,
  SessionWriteSchema,
  SessionUpdateSchema,
  MessageReadSchema,
  MessageAppendSchema,
  MessageUpdateSchema,
  RemoveSchema,
  Repository
}
export type {
  ProviderReadR,
  ProviderWriteP,
  ProviderUpdateP,
  SessionReadR,
  SessionWriteP,
  SessionUpdateP,
  MessageReadR,
  MessageReadP,
  MessageAppendP,
  MessageUpdateP,
  RemoveP
}
