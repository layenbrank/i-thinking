import { create } from 'zustand'

import { DEFAULT_APPROVAL_POLICY } from '@/features/chat/approval.ts'
import type { AgentApprovalMode } from '@/shared/agent-tools'

/**
 * **agent 域自己的设置与数据** —— 谁的功能谁维护。
 *
 * 这里每一项都只服务 agent：工作台与它自己的设置页（`/agent/settings`）读设置
 * （模型 / 审批 / 工具展示），工作区指针是它的运行数据。
 * 应用级设置（窗口 / 外观 / 启动…）**目前一项都没有**，等真有消费者的项出现时再开
 * `stores/settings.ts`；别往这里混装，也别把 agent 的东西塞回应用设置。
 *
 * 分片名就是持久化键（`itc.store` 的 key）：
 * - `chat` 段沿用**数据层命名**（数据层叫 chat、窗口/路由/视图层叫 agent，见
 *   docs/guides/agent-conventions.md）
 * - `workspace` 段是运行指针（不是用户配置项，持久化只为让重开窗口能接着用）
 */
declare namespace Agent {
  /** agent 自己的设置（数据层叫 chat） */
  export interface Chat {
    /**
     * 选中的 provider（null = 自动：按当前可用模型跑，组织模型优先，见
     * `features/chat/port/model.ts` 的 `findFallbackProvider`）。
     * 平台网关是固定 id 的一行（见 `features/chat/platform.ts`），所以这个字段同时
     * 表达「本地 BYOK」与「组织模型」两种来源 —— 来源由 provider 的 kind 决定。
     */
    providerID: string | null
    /** 模型覆盖（空 = 用 provider 的默认模型） */
    model: string
    /**
     * 工具审批策略（Qoder 的「访问权限」）：
     * auto = 需要拍板的动作直接放行 / ask = 只对写类动作逐条问 / readonly = 只给只读工具
     */
    approval: AgentApprovalMode
    /** 工具折叠条是否播报「N 次」 */
    showToolCount: boolean
    /** 工具卡默认展开（不展开时只看到一行摘要） */
    expandTools: boolean
    /** 回合结束后把推理与工具收成一行「已处理 · Ns」 */
    collapseProcess: boolean
    /** 耗时显示：整数秒 / 带小数 */
    durationFormat: DurationFormat
  }

  /** 当前工作区指针：agent 的文件 / git 操作都限定在它之内 */
  export interface Workspace {
    activeWorkspaceID: string | null
  }

  /** 持久化分片（分片名 = `itc.store` 的 key） */
  export interface Composite {
    chat: Chat
    workspace: Workspace
  }
}

/** 耗时显示口径 */
export type DurationFormat = 'integer' | 'precise'

const AGENT: Agent.Composite = {
  chat: {
    providerID: null,
    model: '',
    approval: DEFAULT_APPROVAL_POLICY,
    showToolCount: true,
    expandTools: false,
    collapseProcess: true,
    durationFormat: 'integer'
  },
  workspace: {
    activeWorkspaceID: null
  }
}

/**
 * 读库时只认当前有定义的键。
 *
 * 旧版本在 `chat` 段里存过 `transport` / `onlineModel`（两条通路时代的选择）；
 * 不清理也能跑（合并是「默认值 + 库值」），但废弃键会被后续每次 `update` 写回库里，
 * 让人误以为还有两条通路。
 */
function parseChatSection(value: unknown): Agent.Chat {
  if (!value || typeof value !== 'object') return AGENT.chat
  const stored = value as Agent.Chat
  const chat: Agent.Chat = { ...AGENT.chat }

  for (const key of Object.keys(chat) as (keyof Agent.Chat)[]) {
    const next = stored[key]
    if (next !== undefined) chat[key] = next as never
  }
  return chat
}

/** 读库时把旧键 `activeRootID` 迁到 `activeWorkspaceID` */
function parseWorkspaceSection(value: unknown): Agent.Workspace {
  if (!value || typeof value !== 'object') return AGENT.workspace
  const row = value as { activeWorkspaceID?: unknown; activeRootID?: unknown }
  const id =
    typeof row.activeWorkspaceID === 'string'
      ? row.activeWorkspaceID
      : typeof row.activeRootID === 'string'
        ? row.activeRootID
        : null
  return { activeWorkspaceID: id }
}

async function readSection<K extends keyof Agent.Composite>(
  section: K
): Promise<Agent.Composite[K] | undefined> {
  const value = await itc.store.toRead({ key: section })
  if (value === null || value === undefined) return undefined
  return value as Agent.Composite[K]
}

async function writeSection<K extends keyof Agent.Composite>(
  section: K,
  value: Agent.Composite[K]
): Promise<void> {
  await itc.store.toWrite({ key: section, value })
}

interface AgentStore {
  settings: Agent.Composite
  loaded: boolean
  initialize: () => Promise<void>
  update: <K extends keyof Agent.Composite>(
    section: K,
    value: Partial<Agent.Composite[K]>
  ) => Promise<void>
}

export const useAgentStore = create<AgentStore>(function (setter, getter) {
  return {
    settings: AGENT,
    loaded: false,

    async initialize() {
      if (getter().loaded) return

      const [chat, workspace] = await Promise.all([readSection('chat'), readSection('workspace')])

      setter({
        settings: { chat: parseChatSection(chat), workspace: parseWorkspaceSection(workspace) },
        loaded: true
      })
    },

    async update(section, value) {
      const current = getter().settings
      const merged = { ...current[section], ...value }
      setter({ settings: { ...current, [section]: merged } })
      await writeSection(section, merged)
    }
  }
})
