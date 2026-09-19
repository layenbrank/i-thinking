import { ProviderPanel } from '@/features/chat/provider/panel.tsx'

/**
 * 模型：对照 Qoder 设置里的「模型」。
 *
 * 这一页只管理本机个人模型（自己的 API Key）。对话通路和工具审批在「常规」，
 * 当前生效的模型在输入区切换，不在这里再摆一份只读回显。
 */
export function ModelSection() {
  return <ProviderPanel />
}
