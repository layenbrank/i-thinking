import { buildAgentSystemPrompt } from '@/features/agent/prompt.ts'
import { findActiveThreadID } from '@/features/chat/port/active-thread.ts'
import { AGENT_TOOL_NAMES } from '@/shared/agent-tools'
import { useAgentStore } from '@/stores/agent.ts'

import { createModelPort, type ModelSelection } from '@/features/chat/port/model.ts'

/**
 * 模型端口的**单例**。
 *
 * 放模块作用域而不是组件里：runtime 与工具卡（审批按钮）是两个组件树分支，
 * 审批回执必须打到「当前运行」那一个端口上，各自 new 一份就回不去了。
 */

export function findModelSelection(): ModelSelection {
  const { chat } = useAgentStore.getState().settings
  return { providerID: chat.providerID, model: chat.model }
}

/** 每次运行现读的宿主扩展：工具集 / 审批策略 / 沙箱工作区 / 会话 */
function findHostOptions(): Record<string, unknown> {
  const { chat, workspace } = useAgentStore.getState().settings

  return {
    tools: [...AGENT_TOOL_NAMES],
    approval: chat.approval,
    workspaceID: workspace.activeWorkspaceID,
    sessionID: findActiveThreadID()
  }
}

export const chatModelPort = createModelPort(findModelSelection)

/** 工作区名字（提示词里要让模型知道自己在哪个项目里）由左栏写入，这里只读缓存 */
let activeWorkspaceTitle: string | null = null

export function updateActiveWorkspaceTitle(title: string | null): void {
  activeWorkspaceTitle = title
}

/** @deprecated 用 `updateActiveWorkspaceTitle` */
export function updateActiveRootTitle(title: string | null): void {
  updateActiveWorkspaceTitle(title)
}

/** 每次运行现读系统提示词：工作区变了，提示词随之变 */
export function findSystemPrompt(): string {
  return buildAgentSystemPrompt(activeWorkspaceTitle)
}

export { findHostOptions }
