/**
 * Agent 工具清单（**单一事实源**）。
 *
 * 放在 `shared/` 是因为两端都要用：主进程按它白名单化模型可调用的工具，
 * 渲染进程按它向主进程声明「本次运行允许哪些工具」。任何一端自己写一份都会漂移。
 * 本文件必须框架无关（无 electron / node / dom 依赖）。
 */

export const AGENT_TOOL_NAMES = [
  'fs_list',
  'fs_search',
  'fs_read',
  'fs_write',
  'todo_write'
] as const

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number]

/**
 * 不需要审批的工具：只读三件 + 计划。
 *
 * 名字刻意不叫「只读工具」—— `todo_write` 只把计划写进**本次运行的内存**（不碰磁盘），
 * 但它不是只读语义；用「免审批」描述意图，将来加别的无副作用工具不会被名字挡住。
 */
const APPROVAL_FREE_TOOLS: readonly string[] = ['fs_list', 'fs_search', 'fs_read', 'todo_write']

export function isApprovalFreeTool(name: string): boolean {
  return APPROVAL_FREE_TOOLS.includes(name)
}

export function isAgentToolName(name: string): name is AgentToolName {
  return (AGENT_TOOL_NAMES as readonly string[]).includes(name)
}

/** 工具的中文展示名（审批文案与工具卡共用） */
export const AGENT_TOOL_LABELS: Record<AgentToolName, string> = {
  fs_list: '列目录',
  fs_search: '检索文件',
  fs_read: '读取文件',
  fs_write: '写入文件',
  todo_write: '更新计划'
}
