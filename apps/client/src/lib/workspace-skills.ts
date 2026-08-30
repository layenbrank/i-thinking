/**
 * 工作区技能 IPC：扫描 SKILL.md frontmatter
 */
import { invoke } from '@tauri-apps/api/core'

interface WorkspaceSkill {
  id: string
  name: string
  description: string
  path: string
  relative: string
}

async function fetchSkills(roots: string[]) {
  return invoke<WorkspaceSkill[]>('workspaceSkills:list', {
    params: { roots }
  })
}

const WorkspaceSkills = {
  fetchSkills
}

export { WorkspaceSkills }
export type { WorkspaceSkill }
