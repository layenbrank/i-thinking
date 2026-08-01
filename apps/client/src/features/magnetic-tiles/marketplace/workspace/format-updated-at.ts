import { timeSphere } from '@i-thinking/utils'

function formatUpdatedAt(updatedAt: number | null | undefined) {
  if (!updatedAt) return '暂无更新'
  return `更新于 ${timeSphere.format(new Date(updatedAt), 'YYYY-MM-DD HH:mm')}`
}

export { formatUpdatedAt }
