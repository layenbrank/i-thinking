import { describe, expect, it } from 'vitest'

import { AGENT_ACTIONS_BY_NATURE, type AgentToolNature } from '../../../shared/agent-tools'
import {
  AGENT_PERMISSION_PROFILES,
  describePermission,
  ENV_RULES,
  findPermissionRules,
  findProfileDescription,
  GUARD_EFFECTS,
  NATURE_EFFECTS,
  toPermissionDecision,
  toStudioAgentId,
  type AgentPermissionProfile,
  type PermissionRule
} from './permission'

/**
 * opencode v2 的 permission 是**有序规则数组、last match wins**（v1 是对象映射），
 * 顺序错了不会报错，只会让某条规则被前面的规则吃掉。所以这里守住三条不变式：
 * 1. 兜底规则排在最前，具体规则在后覆盖它；
 * 2. `.env` 加固排在 `read *` 之后（否则 auto 档会读到密钥）；
 * 3. `question` 三档一律 deny（studio 没有回答面）。
 */

const APPROVAL_MODES = ['auto', 'ask', 'readonly'] as const

function findRule(rules: readonly PermissionRule[], action: string): PermissionRule[] {
  return rules.filter(function (rule) {
    return rule.action === action
  })
}

/**
 * v2 的匹配语义是「有序数组 + last match wins」：`*` 通配，最后命中的规则生效。
 * 这里照着重放一遍（含 `ENV_RULES` 用到的 glob 形状），测试才能断言
 * 「某个动作在某个资源上实际是什么效果」。
 */
function findEffective(
  rules: readonly PermissionRule[],
  action: string,
  resource = 'src/a.ts'
): PermissionRule | undefined {
  let effective: PermissionRule | undefined
  for (const rule of rules) {
    if (rule.action !== action && rule.action !== '*') continue
    if (!matches(rule.resource, resource)) continue
    effective = rule
  }
  return effective
}

/** `*` → `[^/]*`（只覆盖规则表里出现的形状），其余字符按字面量 */
function matches(pattern: string, value: string): boolean {
  if (pattern === '*') return true
  if (!pattern.includes('*')) return pattern === value

  const body = pattern
    .split('*')
    .map(function (part) {
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('[^/]*')
  return new RegExp(`^${body}$`).test(value)
}

describe('findPermissionRules · 有序性与 last match wins', function () {
  it('兜底规则排在最前，取 mutating 的效果', function () {
    for (const mode of APPROVAL_MODES) {
      const rules = findPermissionRules(mode)
      expect(rules[0], mode).toEqual({
        action: '*',
        resource: '*',
        effect: NATURE_EFFECTS[mode].mutating
      })
    }
  })

  it('有没有点名的具体规则都排在兜底之后（否则等于没写）', function () {
    for (const mode of APPROVAL_MODES) {
      const rules = findPermissionRules(mode)
      const catchAll = rules.indexOf(rules[0])
      for (const rule of rules.slice(1)) {
        expect(rules.indexOf(rule), `${mode}:${rule.action}`).toBeGreaterThan(catchAll)
      }
    }
  })

  it('越界守卫在工具规则之后、.env 加固之前', function () {
    const rules = findPermissionRules('ask')
    const guard = rules.findIndex(function (rule) {
      return rule.action === 'external_directory'
    })
    const firstEnv = rules.findIndex(function (rule) {
      return rule.action === 'read'
    })

    expect(guard).toBeGreaterThan(1)
    expect(rules[guard + 1]).toEqual(ENV_RULES[0])
    expect(rules.length).toBe(guard + 1 + ENV_RULES.length)
    expect(firstEnv).toBeGreaterThanOrEqual(0)
  })

  it('.env 加固排在 read 规则之后（auto 档也读不到密钥）', function () {
    for (const mode of APPROVAL_MODES) {
      const rules = findPermissionRules(mode)
      expect(findEffective(rules, 'read', '.env')?.effect, mode).toBe('deny')
      expect(findEffective(rules, 'read', '.env.local')?.effect, mode).toBe('deny')
      expect(findEffective(rules, 'read', '.env.example')?.effect, mode).toBe('allow')
      expect(findEffective(rules, 'read', 'src/a.ts')?.effect, mode).toBe('allow')
      expect(
        rules.some(function (rule) {
          return rule.action === 'read' && rule.resource === '*.env' && rule.effect === 'deny'
        }),
        mode
      ).toBe(true)
    }
  })

  it('每次调用返回新数组（调用方持有的规则不会被下次生成污染）', function () {
    const first = findPermissionRules('ask')
    first.push({ action: 'injected', resource: '*', effect: 'allow' })

    expect(findRule(findPermissionRules('ask'), 'injected')).toEqual([])
  })
})

describe('findPermissionRules · 三档落地', function () {
  it('性质 → effect 与档位表一致，并且是最后命中的那条', function () {
    for (const mode of APPROVAL_MODES) {
      const rules = findPermissionRules(mode)
      for (const nature of ['readonly', 'mutating', 'unavailable'] as AgentToolNature[]) {
        for (const action of AGENT_ACTIONS_BY_NATURE[nature]) {
          expect(findEffective(rules, action), `${mode}:${action}`).toEqual({
            action,
            resource: '*',
            effect: NATURE_EFFECTS[mode][nature]
          })
        }
      }
    }
  })

  it('readonly 档拒掉全部有副作用动作、留只读动作', function () {
    const rules = findPermissionRules('readonly')

    for (const action of AGENT_ACTIONS_BY_NATURE.mutating) {
      expect(findEffective(rules, action)?.effect, action).toBe('deny')
    }
    for (const action of AGENT_ACTIONS_BY_NATURE.readonly) {
      expect(findEffective(rules, action)?.effect, action).toBe('allow')
    }
  })

  it('ask 档只读放行、有副作用逐次确认', function () {
    const rules = findPermissionRules('ask')

    for (const action of AGENT_ACTIONS_BY_NATURE.readonly) {
      expect(findEffective(rules, action)?.effect, action).toBe('allow')
    }
    for (const action of AGENT_ACTIONS_BY_NATURE.mutating) {
      expect(findEffective(rules, action)?.effect, action).toBe('ask')
    }
  })

  it('auto 档放行有副作用动作（越界与 .env 除外）', function () {
    const rules = findPermissionRules('auto')

    for (const action of AGENT_ACTIONS_BY_NATURE.mutating) {
      expect(findEffective(rules, action)?.effect, action).toBe('allow')
    }
  })

  it('question 三档一律 deny（没有回答面的工具一个都不给）', function () {
    for (const mode of APPROVAL_MODES) {
      expect(findEffective(findPermissionRules(mode), 'question')?.effect, mode).toBe('deny')
    }
  })

  it('越界守卫按档位：自动/询问先问，只读直接拒绝', function () {
    for (const mode of APPROVAL_MODES) {
      expect(findEffective(findPermissionRules(mode), 'external_directory'), mode).toEqual({
        action: 'external_directory',
        resource: '*',
        effect: GUARD_EFFECTS[mode]
      })
    }
  })

  it('与档位无关的规则不随档位变化', function () {
    const ask = findPermissionRules('ask').filter(function (rule) {
      return rule.action === 'read' && rule.resource.includes('.env')
    })
    const auto = findPermissionRules('auto').filter(function (rule) {
      return rule.action === 'read' && rule.resource.includes('.env')
    })

    expect(ask).toEqual(auto)
    expect(ask).toEqual([...ENV_RULES])
  })
})

describe('chat 档 · 模型不支持工具', function () {
  it('一条兜底 deny 就够：所有动作（含只读）都拿不到', function () {
    const rules = findPermissionRules('chat')

    expect(rules).toEqual([{ action: '*', resource: '*', effect: 'deny' }])
    for (const action of [
      ...AGENT_ACTIONS_BY_NATURE.readonly,
      ...AGENT_ACTIONS_BY_NATURE.mutating
    ]) {
      expect(findEffective(rules, action)?.effect, action).toBe('deny')
    }
  })
})

describe('agent 档位命名', function () {
  it('档位清单是四个（三档审批 + 纯聊天）且 id 互不重复', function () {
    expect([...AGENT_PERMISSION_PROFILES].sort()).toEqual(
      [...APPROVAL_MODES, 'chat'].sort()
    )

    const ids = AGENT_PERMISSION_PROFILES.map(toStudioAgentId)
    expect(ids).toEqual(['studio-auto', 'studio-ask', 'studio-readonly', 'studio-chat'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个档位都有说明（opencode 的 agent 列表要能读懂）', function () {
    for (const profile of AGENT_PERMISSION_PROFILES as readonly AgentPermissionProfile[]) {
      expect(findProfileDescription(profile).length, profile).toBeGreaterThan(0)
    }
  })
})

describe('toPermissionDecision · 回执只有一次性两种', function () {
  it('同意 → once，拒绝 → reject（always 会持久化规则，与配置里的 deny 打架）', function () {
    expect(toPermissionDecision(true)).toBe('once')
    expect(toPermissionDecision(false)).toBe('reject')
  })
})

describe('describePermission · 审批弹窗文案', function () {
  it('动作翻成中文，多个目标顿号连接', function () {
    expect(describePermission('edit', ['a.ts', 'b.ts'])).toBe('修改文件：a.ts、b.ts')
  })

  it('没给目标时也要有一句话（不能显示成半截）', function () {
    expect(describePermission('shell', [])).toBe('执行命令：（未指定目标）')
  })

  it('认不出的动作原样展示', function () {
    expect(describePermission('mcp__github__search', ['*'])).toBe('mcp__github__search：*')
  })
})
