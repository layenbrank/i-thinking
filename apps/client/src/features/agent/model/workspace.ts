/** 工作区图标 / 副色选项（对齐 Qoder 新建工作区） */

interface WorkspaceIconOption {
  key: string
  icon: string
}

const WORKSPACE_ICONS: WorkspaceIconOption[] = [
  { key: 'folder', icon: 'ant-design:folder-outlined' },
  { key: 'code', icon: 'ant-design:code-outlined' },
  { key: 'layout', icon: 'ant-design:appstore-outlined' },
  { key: 'cloud', icon: 'ant-design:cloud-outlined' },
  { key: 'atom', icon: 'ant-design:experiment-outlined' },
  { key: 'setting', icon: 'ant-design:setting-outlined' },
  { key: 'database', icon: 'ant-design:database-outlined' },
  { key: 'bulb', icon: 'ant-design:bulb-outlined' },
  { key: 'rocket', icon: 'ant-design:rocket-outlined' },
  { key: 'book', icon: 'ant-design:book-outlined' },
  { key: 'api', icon: 'ant-design:api-outlined' },
  { key: 'tool', icon: 'ant-design:tool-outlined' },
  { key: 'global', icon: 'ant-design:global-outlined' },
  { key: 'desktop', icon: 'ant-design:desktop-outlined' },
  { key: 'coffee', icon: 'ant-design:coffee-outlined' }
]

const WORKSPACE_COLORS = [
  '#166534',
  '#14532d',
  '#1e3a8a',
  '#1d4ed8',
  '#0e7490',
  '#0f766e',
  '#854d0e',
  '#9a3412',
  '#9f1239',
  '#86198f',
  '#5b21b6',
  '#3730a3',
  '#334155',
  '#3f3f46',
  '#171717'
]

const WORKSPACE_ICON = 'folder'
const WORKSPACE_COLOR = '#166534'
const UNGROUPED_WORKSPACE = '__ungrouped__'

function findWorkspaceIcon(key: string) {
  const matched = WORKSPACE_ICONS.find(function (item) {
    return item.key === key
  })
  return matched?.icon ?? WORKSPACE_ICONS[0].icon
}

export {
  WORKSPACE_ICONS,
  WORKSPACE_COLORS,
  WORKSPACE_ICON,
  WORKSPACE_COLOR,
  UNGROUPED_WORKSPACE,
  findWorkspaceIcon
}
export type { WorkspaceIconOption }
