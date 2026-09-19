import { ProviderPanel } from '@/features/chat/provider/panel.tsx'

/**
 * 模型：对照 Qoder 设置里的「模型」。
 *
 * 这一页只管理**本地通路**的个人 provider（本机 + BYOK，密钥进主进程）。
 * 在线通路的模型目录来自 rust-service `GET /gateway/models`，在输入区切换。
 * 对话通路和工具审批在「常规」。
 */
export function ModelSection() {
  return <ProviderPanel />
}
