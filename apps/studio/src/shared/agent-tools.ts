/**
 * opencode v2 内建工具清单（**单一事实源**）。
 *
 * 工具**真的在 opencode 里执行** —— studio 只把用户选的三档审批编译成 opencode 的
 * permission 规则（见 `host/capabilities/opencode/permission.ts`），不自己实现工具。
 * 所以这份清单必须与 opencode 实际注册的工具名一致：名字对不上时工具卡标题会退化成
 * 英文原名，permission 规则会落到兜底规则上（有副作用的工具被静默放行）。
 *
 * 名字取自实测（opencode 2.0.15，全 allow 时模型可见的工具集）：edit / glob / grep /
 * question / read / shell / skill / subagent / webfetch / websearch / write / execute；
 * 模型直出补丁时还会多一个 `patch`。
 *
 * 与 v1 的差异（实测，勿凭直觉改）：
 * 1. `bash` → **`shell`**、`task` → **`subagent`**：v1 的名字在 v2 里已经不存在；
 * 2. `todowrite` / `lsp` / `invalid` **在 v2 里没有**（计划改由模型在回答里自己维护）；
 * 3. `edit` / `write` / `patch` 是三个各自独立的工具，permission 上同属 **`edit`** 类别；
 * 4. v2 没有「按请求关工具」的开关（v1 的 `tools: { name: false }`），工具可见性**完全由
 *    permission 决定**：effect 落到 `deny` 的动作，模型连看都看不到（实测只剩只读动作）；
 * 5. `question`（反问用户）在 studio 里没有回答面 —— serve 模式下弹出来没人能回答，模型会
 *    一直等在那里，所以三档一律 deny（是规则表里的一条 deny，而不是「禁用标记」）。
 *
 * 放在 `shared/` 是因为两端都要用：主进程按它生成 permission 规则，渲染进程按它显示中文标题。
 * 本文件必须框架无关（无 electron / node / dom 依赖）。
 */

/** 审批档位：渲染进程选、主进程拍板，最终编译成 opencode 的自定义 agent。跨进程契约的一部分 */
export const AGENT_APPROVAL_MODES = ['ask', 'auto', 'readonly'] as const

export type AgentApprovalMode = (typeof AGENT_APPROVAL_MODES)[number]

/**
 * 工具的「性质」—— studio 侧唯一需要知道的分寸：
 * - `readonly`    不改磁盘、不出网，任何档位都放行；
 * - `mutating`    写盘 / 执行命令 / 派子任务，只读档 deny（模型看不到），其余档位按档位拍板；
 * - `unavailable` studio 没有对应交互面，任何档位都 deny。
 */
export type AgentToolNature = 'readonly' | 'mutating' | 'unavailable'

export interface AgentToolMeta {
  /** 中文展示名（工具卡标题、审批文案共用） */
  label: string
  /** opencode permission 里管住它的 action；与工具名不同的（`write` → `edit`）在这里对齐 */
  action: string
  nature: AgentToolNature
}

const AGENT_TOOLS = {
  read: { label: '读取文件', action: 'read', nature: 'readonly' },
  glob: { label: '匹配文件', action: 'glob', nature: 'readonly' },
  grep: { label: '检索内容', action: 'grep', nature: 'readonly' },
  webfetch: { label: '抓取网页', action: 'webfetch', nature: 'readonly' },
  websearch: { label: '联网搜索', action: 'websearch', nature: 'readonly' },
  skill: { label: '调用技能', action: 'skill', nature: 'readonly' },
  edit: { label: '修改文件', action: 'edit', nature: 'mutating' },
  write: { label: '写入文件', action: 'edit', nature: 'mutating' },
  patch: { label: '应用补丁', action: 'edit', nature: 'mutating' },
  shell: { label: '执行命令', action: 'shell', nature: 'mutating' },
  subagent: { label: '派生子任务', action: 'subagent', nature: 'mutating' },
  execute: { label: '执行代码', action: 'execute', nature: 'mutating' },
  question: { label: '反问用户', action: 'question', nature: 'unavailable' }
} as const satisfies Record<string, AgentToolMeta>

export type AgentToolName = keyof typeof AGENT_TOOLS

const AGENT_TOOL_ENTRIES: ReadonlyArray<readonly [AgentToolName, AgentToolMeta]> = Object.entries(
  AGENT_TOOLS
) as Array<[AgentToolName, AgentToolMeta]>

/** 工具名 → 元数据；未知名字查不到（表驱动，不猜也不丢） */
const AGENT_TOOL_INDEX = new Map<string, AgentToolMeta>(AGENT_TOOL_ENTRIES)

/** 工具表枚举（顺序即表里的书写顺序）。测试拿它跟 opencode 实测清单对账 */
export const AGENT_TOOL_NAMES: readonly AgentToolName[] = AGENT_TOOL_ENTRIES.map(function (entry) {
  return entry[0]
})

/**
 * 性质 → 该性质覆盖的 permission action（去重，edit/write/patch 合成一条 `edit`）。
 *
 * permission 规则的生成只认这张表：新增一个工具时改 `AGENT_TOOLS` 一处即可，三档规则会
 * 自动跟上 —— 不需要在规则编译器里再加分支。
 */
export const AGENT_ACTIONS_BY_NATURE: Readonly<Record<AgentToolNature, readonly string[]>> =
  AGENT_TOOL_ENTRIES.reduce<Record<AgentToolNature, string[]>>(
    function (groups, entry) {
      const [, tool] = entry
      const actions = groups[tool.nature]
      if (!actions.includes(tool.action)) actions.push(tool.action)
      return groups
    },
    { readonly: [], mutating: [], unavailable: [] }
  )

/** 不是工具的 permission action（opencode 自己的守卫），审批文案单独给名 */
const GUARD_ACTION_LABELS: Readonly<Record<string, string>> = {
  external_directory: '访问工作区外目录'
}

/** permission action → 中文名；同一 action 的多个工具取第一个（`edit` → 修改文件） */
const AGENT_ACTION_LABELS: Readonly<Record<string, string>> = Object.assign(
  AGENT_TOOL_ENTRIES.reduce<Record<string, string>>(function (labels, entry) {
    const [, tool] = entry
    if (!(tool.action in labels)) labels[tool.action] = tool.label
    return labels
  }, {}),
  GUARD_ACTION_LABELS
)

export function findAgentTool(name: string): AgentToolMeta | null {
  return AGENT_TOOL_INDEX.get(name) ?? null
}

/** permission action → 中文名；认不出的 action（MCP 工具是 `<server>_<tool>`）原样返回 */
export function toAgentActionLabel(action: string): string {
  return AGENT_ACTION_LABELS[action] ?? action
}

/** 工具卡标题：认不出的名字原样返回（opencode 升级新增工具时不会显示成空白） */
export function toAgentToolLabel(name: string): string {
  return findAgentTool(name)?.label ?? name
}
