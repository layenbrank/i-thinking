/**
 * Agent 视图壳层：全局设置初始化 + 工作台渲染
 */
import { useEffect } from 'react'

import { Agent } from '@/features/agent/agent'
import { useSettingsStore } from '@/stores/setting.ts'

export default function AgentView() {
  useEffect(function () {
    void useSettingsStore.getState().toInitialize()
  }, [])

  return <Agent />
}
