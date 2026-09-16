import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildAgentTools, pickAgentTools } from './agent-tools'

/**
 * 工具集边界的单测：无工作区不给工具、路径越界必须变成 ok:false、
 * 未声明的工具不得暴露给模型 —— 这三条是「Agent 能碰什么」的全部保证。
 */

let root = ''

beforeEach(function () {
  root = mkdtempSync(path.join(tmpdir(), 'agent-tools-'))
  writeFileSync(path.join(root, 'note.md'), 'hello')
})

afterEach(function () {
  rmSync(root, { recursive: true, force: true })
})

/** AI SDK 的 tool 对象上挂着 execute，测试里直接手调（不起模型） */
type Executable = { execute?: (input: never, options: never) => Promise<unknown> }

async function runTool(tools: ReturnType<typeof buildAgentTools>, name: string, input: unknown) {
  const definition = tools[name] as Executable | undefined
  if (!definition?.execute) throw new Error(`tool ${name} has no execute`)
  return definition.execute(input as never, {} as never)
}

describe('buildAgentTools', function () {
  it('offers only the plan tool without a workspace root', function () {
    // 没选工作区只是读写不了文件；列计划这件事照旧做得了
    expect(Object.keys(buildAgentTools(null))).toEqual(['todo_write'])
  })

  it('returns the whole plan from todo_write and stamps stable ids', async function () {
    const tools = buildAgentTools(root)

    const actual = await runTool(tools, 'todo_write', {
      items: [
        { text: '读 README', status: 'completed' },
        { text: '改代码', status: 'in_progress' }
      ]
    })

    expect(actual).toEqual({
      ok: true,
      items: [
        { id: 'todo-1', text: '读 README', status: 'completed' },
        { id: 'todo-2', text: '改代码', status: 'in_progress' }
      ]
    })
  })

  it('exposes the plan tool plus every fs tool with a root', function () {
    expect(Object.keys(buildAgentTools(root)).toSorted()).toEqual([
      'fs_list',
      'fs_read',
      'fs_search',
      'fs_write',
      'todo_write'
    ])
  })

  it('reads a file inside the root', async function () {
    const tools = buildAgentTools(root)

    const actual = await runTool(tools, 'fs_read', { path: 'note.md' })

    expect(actual).toEqual({ ok: true, path: 'note.md', content: 'hello' })
  })

  it('lists the root and searches by name', async function () {
    const tools = buildAgentTools(root)

    expect(await runTool(tools, 'fs_list', {})).toMatchObject({ ok: true })
    expect(await runTool(tools, 'fs_search', { query: 'note' })).toEqual({
      ok: true,
      hits: [{ name: 'note.md', relative: 'note.md' }]
    })
  })

  it('writes a file and reports it as created', async function () {
    const tools = buildAgentTools(root)

    const actual = await runTool(tools, 'fs_write', { path: 'src/new.ts', content: 'export {}' })

    expect(actual).toMatchObject({ ok: true, path: 'src/new.ts', created: true, changed: true })
    expect(await runTool(tools, 'fs_read', { path: 'src/new.ts' })).toMatchObject({ ok: true })
  })

  it('turns an escape attempt into a structured failure, not a silent success', async function () {
    const tools = buildAgentTools(root)

    const actual = await runTool(tools, 'fs_read', { path: '../../etc/passwd' })

    expect(actual).toMatchObject({ ok: false })
    expect(String((actual as { error: string }).error)).toContain('越出工作区根')
  })

  it('refuses to write outside the root', async function () {
    const tools = buildAgentTools(root)

    const actual = await runTool(tools, 'fs_write', { path: '../escape.txt', content: 'x' })

    expect(actual).toMatchObject({ ok: false })
  })
})

describe('pickAgentTools', function () {
  it('keeps only declared tools', function () {
    const tools = buildAgentTools(root)

    expect(Object.keys(pickAgentTools(tools, ['fs_read']))).toEqual(['fs_read'])
  })

  it('ignores unknown names and an empty declaration', function () {
    const tools = buildAgentTools(root)

    expect(Object.keys(pickAgentTools(tools, ['rm_rf']))).toEqual([])
    expect(Object.keys(pickAgentTools(tools, []))).toEqual([])
  })
})
