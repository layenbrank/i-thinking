import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { tool, type ToolSet } from 'ai'
import { z } from 'zod'

import { isAgentToolName } from '../../shared/agent-tools'
import { workspaceChangeJournal } from './workspace-changes'
import { listEntries, readTextFile, resolveInside, searchEntries } from './workspace-path'

/**
 * Agent 的工具集（主进程执行）。
 *
 * 为什么在 main：沙箱根、文件系统、审批都归信任边界，渲染进程既拿不到密钥也不该有 fs 能力。
 * 每个工具都只接受**根内相对路径**，越界由 `workspace-path.ts` 的 `resolveInside` 拒绝。
 *
 * 只读工具（list / search / read）返回结构化结果；写工具返回 `{ changed, bytesWritten }`，
 * 让模型能自己判断「是否真的写进去了」。
 */

interface ToolError {
  ok: false
  error: string
}

function reportToolError(error: unknown): ToolError {
  const message = error instanceof Error ? error.message : String(error)
  // 工具失败必须出声：既回给模型（让它自己纠偏），也落一条日志（eslint 的 catch 规则认这个「输出」）
  console.warn('[agent-tools] 工具执行失败', message)
  return { ok: false, error: message }
}

function toRelative(parent: string, absolute: string): string {
  return path.relative(parent, absolute).split(path.sep).join('/')
}

/** 计划条数上限：右侧面板是给人看的，不是待办清单工具 */
const MAX_PLAN_ITEMS = 30

/**
 * 计划工具：**不需要工作区**（它只把计划写进本次运行的结果里，不碰磁盘）。
 *
 * 返回值里带了稳定的 `id`，渲染侧直接用做 React key —— 否则每次都靠下标，
 * 条目增删时会错位到别的 DOM 上。
 */
function buildTodoWriteTool() {
  return tool({
    description:
      '写/更新本次任务的计划清单（整份覆盖，不是增量）。多步任务开工前先列一次，之后每完成一步再整份更新状态。',
    inputSchema: z.object({
      items: z
        .array(
          z.object({
            text: z.string().min(1).max(300).describe('一步要做的事，动词开头'),
            status: z.enum(['pending', 'in_progress', 'completed'])
          })
        )
        .max(MAX_PLAN_ITEMS)
        .describe('完整清单，按执行顺序排列')
    }),
    execute(input) {
      return Promise.resolve({
        ok: true as const,
        items: input.items.map(function (item, index) {
          return { id: `todo-${index + 1}`, text: item.text, status: item.status }
        })
      })
    }
  })
}

/**
 * 造工具集。
 *
 * `rootPath` 为空时仍然给 `todo_write` —— 没选工作区只是读写不了文件，
 * 列计划这件事照旧做得了。
 *
 * `sessionID` 有值时，`fs_write` 落盘前写入变更日记（供撤销卡汇总 added/removed）。
 */
export function buildAgentTools(
  rootPath: string | null,
  sessionID?: string | null
): ToolSet {
  const tools: ToolSet = { todo_write: buildTodoWriteTool() }

  if (!rootPath) return tools

  return {
    ...tools,
    fs_list: tool({
      description: '列出工作区内的目录内容（不递归）。path 是相对工作区根的路径，省略表示根目录。',
      inputSchema: z.object({
        path: z.string().max(2048).optional().describe('相对工作区根的目录路径')
      }),
      async execute(input) {
        try {
          const entries = listEntries(rootPath, input.path ?? '')
          return {
            ok: true,
            entries: entries.slice(0, 200),
            truncated: entries.length > 200
          }
        } catch (error) {
          return reportToolError(error)
        }
      }
    }),

    fs_search: tool({
      description: '按文件名在工作区内检索（不搜文件内容），返回相对路径。',
      inputSchema: z.object({
        query: z.string().min(1).max(200).describe('文件名包含的关键字'),
        limit: z.number().int().min(1).max(100).optional()
      }),
      async execute(input) {
        try {
          return { ok: true, hits: searchEntries(rootPath, input.query, input.limit) }
        } catch (error) {
          return reportToolError(error)
        }
      }
    }),

    fs_read: tool({
      description: '读取工作区内的文本文件（上限 2MB）。path 是相对工作区根的路径。',
      inputSchema: z.object({
        path: z.string().min(1).max(2048).describe('相对工作区根的文件路径')
      }),
      async execute(input) {
        try {
          return { ok: true, path: input.path, content: readTextFile(rootPath, input.path) }
        } catch (error) {
          return reportToolError(error)
        }
      }
    }),

    fs_write: tool({
      description:
        '写入工作区内的文本文件（覆盖写，自动建父目录）。改已存在的文件前先用 fs_read 看清内容。',
      inputSchema: z.object({
        path: z.string().min(1).max(2048).describe('相对工作区根的文件路径'),
        content: z.string().max(400_000).describe('完整文件内容')
      }),
      async execute(input) {
        try {
          const target = resolveInside(rootPath, input.path)
          const before = existsSync(target) && statSync(target).isFile()

          const journal = sessionID
            ? workspaceChangeJournal.record({
                sessionID,
                rootPath,
                relative: input.path,
                nextContent: input.content
              })
            : null

          mkdirSync(path.dirname(target), { recursive: true })
          writeFileSync(target, input.content, 'utf8')

          return {
            ok: true,
            path: toRelative(rootPath, target),
            created: journal?.created ?? !before,
            changed: true,
            bytesWritten: Buffer.byteLength(input.content, 'utf8'),
            ...(journal
              ? { added: journal.added, removed: journal.removed, changeID: journal.id }
              : {})
          }
        } catch (error) {
          return reportToolError(error)
        }
      }
    })
  } satisfies ToolSet
}

/** 只保留请求里声明的工具；未声明的一律不暴露给模型 */
export function pickAgentTools(all: ToolSet, names: readonly string[] | undefined): ToolSet {
  if (!names || names.length === 0) return {}

  const picked: ToolSet = {}
  for (const name of names) {
    if (!isAgentToolName(name)) continue
    const definition = all[name]
    if (!definition) continue
    picked[name] = definition
  }
  return picked
}
