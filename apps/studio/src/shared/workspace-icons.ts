/** 工作区图标 / 副色选项（对齐 Qoder；主进程与渲染进程共用） */

interface WorkspaceIconOption {
  key: string
  label: string
}

const WORKSPACE_ICONS: WorkspaceIconOption[] = [
  { key: 'folder', label: '文件夹' },
  { key: 'code', label: '代码' },
  { key: 'layout', label: '布局' },
  { key: 'cloud', label: '云' },
  { key: 'atom', label: '实验' },
  { key: 'setting', label: '设置' },
  { key: 'database', label: '数据库' },
  { key: 'bulb', label: '想法' },
  { key: 'rocket', label: '火箭' },
  { key: 'book', label: '书本' },
  { key: 'api', label: '接口' },
  { key: 'tool', label: '工具' },
  { key: 'global', label: '全球' },
  { key: 'desktop', label: '桌面' },
  { key: 'coffee', label: '咖啡' }
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
] as const

const WORKSPACE_ICON = 'folder'
const WORKSPACE_COLOR = '#166534'

function findWorkspaceIcon(key: string): WorkspaceIconOption {
  return (
    WORKSPACE_ICONS.find(function (item) {
      return item.key === key
    }) ?? WORKSPACE_ICONS[0]
  )
}

export {
  WORKSPACE_ICONS,
  WORKSPACE_COLORS,
  WORKSPACE_ICON,
  WORKSPACE_COLOR,
  findWorkspaceIcon
}
export type { WorkspaceIconOption }
