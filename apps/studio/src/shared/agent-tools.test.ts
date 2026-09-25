import { describe, expect, it } from 'vitest'

import {
  AGENT_ACTIONS_BY_NATURE,
  AGENT_APPROVAL_MODES,
  AGENT_TOOL_NAMES,
  findAgentTool,
  toAgentActionLabel,
  toAgentToolLabel
} from './agent-tools'

/**
 * 这份表是「studio 三档审批」与「opencode 真实工具」之间的唯一接口：名字写错不会报错，
 * 只会静默失效（工具卡标题退化成英文原名、permission 规则落到兜底规则上）。所以这里把
 * 实测到的工具名钉住，并守住几条分类不变量。
 */

/** 实测清单：opencode 2.0.15，全 allow 时模型可见的工具集（`full-tools-*.txt`） */
const PROBED_TOOL_NAMES = [
  'edit',
  'execute',
  'glob',
  'grep',
  'question',
  'read',
  'shell',
  'skill',
  'subagent',
  'webfetch',
  'websearch',
  'write'
]

/** `patch` 是条件工具：只对部分 GPT 系模型暴露，其余模型拿到 edit + write */
const CONDITIONAL_TOOL_NAMES = ['patch']

/** v1 的名字与内部工具：v2 里一个都不存在，混进来就会多出一条永不命中的规则 */
const STALE_TOOL_NAMES = [
  'apply_patch',
  'bash',
  'invalid',
  'list',
  'lsp',
  'task',
  'todoread',
  'todowrite'
]

function toSorted(values: readonly string[]): string[] {
  return [...values].sort()
}

describe('AGENT_TOOL_NAMES · 与 opencode 实际工具对齐', function () {
  it('表里的名字与实测清单完全一致（多一个少一个都是 bug）', function () {
    expect(toSorted(AGENT_TOOL_NAMES)).toEqual(
      toSorted([...PROBED_TOOL_NAMES, ...CONDITIONAL_TOOL_NAMES])
    )
  })

  it('实测拿到的工具名一个都不能漏（漏掉的会被 permission 兜底规则挡死）', function () {
    for (const name of PROBED_TOOL_NAMES) {
      expect(findAgentTool(name), name).not.toBeNull()
    }
  })

  it('不含 v1 的陈旧名字与内部工具', function () {
    for (const stale of STALE_TOOL_NAMES) {
      expect(findAgentTool(stale), stale).toBeNull()
    }
  })

  it('每个工具都有中文展示名', function () {
    for (const name of AGENT_TOOL_NAMES) {
      expect(toAgentToolLabel(name), name).not.toBe(name)
      expect(toAgentToolLabel(name).length).toBeGreaterThan(0)
    }
  })

  it('认不出的名字原样返回（opencode 升级新增工具时不至于显示成空白）', function () {
    expect(findAgentTool('ping_ping')).toBeNull()
    expect(toAgentToolLabel('ping_ping')).toBe('ping_ping')
  })
})

describe('AGENT_ACTIONS_BY_NATURE · 分类不变量', function () {
  it('三个写工具同属 edit 类别（deny edit 就必须一起不可用）', function () {
    for (const name of ['edit', 'write', 'patch']) {
      const tool = findAgentTool(name)
      expect(tool?.action, name).toBe('edit')
      expect(tool?.nature, name).toBe('mutating')
    }
  })

  it('question 是工作室答不了的交互面（serve 模式下没人能回答）', function () {
    expect(findAgentTool('question')?.nature).toBe('unavailable')
  })

  it('每个性质分组里的 action 已去重且与工具表一致', function () {
    expect(toSorted(AGENT_ACTIONS_BY_NATURE.readonly)).toEqual(
      toSorted(['glob', 'grep', 'read', 'skill', 'webfetch', 'websearch'])
    )
    expect(toSorted(AGENT_ACTIONS_BY_NATURE.mutating)).toEqual(
      toSorted(['edit', 'execute', 'shell', 'subagent'])
    )
    expect(toSorted(AGENT_ACTIONS_BY_NATURE.unavailable)).toEqual(['question'])

    for (const nature of ['readonly', 'mutating', 'unavailable'] as const) {
      const actions = AGENT_ACTIONS_BY_NATURE[nature]
      expect(new Set(actions).size).toBe(actions.length)
    }
  })

  it('三个性质分组覆盖了表里全部的 action（漏一个就会落到兜底规则上）', function () {
    const grouped = new Set([
      ...AGENT_ACTIONS_BY_NATURE.readonly,
      ...AGENT_ACTIONS_BY_NATURE.mutating,
      ...AGENT_ACTIONS_BY_NATURE.unavailable
    ])

    for (const name of AGENT_TOOL_NAMES) {
      const action = findAgentTool(name)?.action
      expect(action && grouped.has(action), `${name} → ${String(action)}`).toBe(true)
    }
  })
})

describe('审批档位', function () {
  it('只有三档，且都在契约里', function () {
    expect(toSorted(AGENT_APPROVAL_MODES)).toEqual(toSorted(['ask', 'auto', 'readonly']))
  })
})

describe('toAgentActionLabel · permission action 的中文名', function () {
  it('工具 action 取同类别里第一个工具的名字', function () {
    expect(toAgentActionLabel('edit')).toBe('修改文件')
    expect(toAgentActionLabel('shell')).toBe('执行命令')
  })

  it('越界守卫不是工具，单独给名', function () {
    expect(toAgentActionLabel('external_directory')).toBe('访问工作区外目录')
  })

  it('认不出的 action（MCP 工具是 `<server>_<tool>`）原样返回', function () {
    expect(toAgentActionLabel('mcp__github__search')).toBe('mcp__github__search')
  })
})
