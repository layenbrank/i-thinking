/**
 * corex 的权限词汇。指令声明自己「要用哪几样能力」，动作声明自己「需要哪几样」。
 *
 * 编辑器的勾选面板与动作库的展示用的是同一套名字、图标、顺序 —— 放一处，
 * 免得两边各写一遍，改名时漏掉一边。
 */

const PERMISSION_KEYS = [
  'capture',
  'clipboard',
  'filesystem',
  'network',
  'notifications',
  'secret',
  'shell',
  'ui'
] as const

type PermissionKey = (typeof PERMISSION_KEYS)[number]

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  capture: '截屏',
  clipboard: '剪贴板',
  filesystem: '文件系统',
  network: '网络',
  notifications: '通知',
  secret: '密钥',
  shell: 'Shell',
  ui: '界面'
}

const PERMISSION_ICONS: Record<PermissionKey, string> = {
  capture: 'mdi:monitor-screenshot',
  clipboard: 'mdi:clipboard-outline',
  filesystem: 'mdi:folder-outline',
  network: 'mdi:web',
  notifications: 'mdi:bell-outline',
  secret: 'mdi:key-outline',
  shell: 'mdi:console',
  ui: 'mdi:application-outline'
}

const UNKNOWN_PERMISSION_ICON = 'mdi:shield-outline'

/** 动作声明的权限串来自 corex，可能比这里认识的更新：认不出就原样显示，不猜也不丢 */
function findPermissionLabel(id: string): string {
  return PERMISSION_LABELS[id as PermissionKey] ?? id
}

function findPermissionIcon(id: string): string {
  return PERMISSION_ICONS[id as PermissionKey] ?? UNKNOWN_PERMISSION_ICON
}

export { PERMISSION_ICONS, PERMISSION_KEYS, PERMISSION_LABELS, findPermissionIcon, findPermissionLabel }
export type { PermissionKey }
