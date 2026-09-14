import { useThreadTokenUsage } from '@assistant-ui/ai-sdk'
import { clsx } from 'clsx'

import { formatUsage } from '@/features/chat/usage.ts'

import styles from '@/views/chat/chat.module.scss'

/** 会话用量（读最新一条带用量的助手消息）；没有用量时不渲染 */
export function UsageLine() {
  const usage = useThreadTokenUsage()
  const text = formatUsage(usage)

  if (!text) return null

  return <div className={clsx(styles.usage)}>{text}</div>
}
