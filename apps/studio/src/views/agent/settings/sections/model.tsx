import { Badge } from '@i-thinking/design/components/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { CircleAlertIcon } from 'lucide-react'

import { APPROVAL_POLICIES, type ApprovalPolicy } from '@/features/chat/approval.ts'
import { ProviderPanel } from '@/features/chat/provider/panel.tsx'
import {
  CHAT_TRANSPORT_KINDS,
  CHAT_TRANSPORTS,
  findChatEndpoint,
  resolveChatTransport,
  type ChatTransportKind
} from '@/features/chat/transport.ts'
import { useAgentStore } from '@/stores/agent.ts'
import { SettingRow, SettingsSection } from '@/views/agent/settings/components/section.tsx'

/**
 * 模型：对话通路、审批策略、当前生效的模型，以及本地 provider 的接入。
 *
 * 从原设置弹窗搬过来，按新页面的分组排版；行为一字未改。
 */

/** 通路不可用的**具体**原因：把「为什么点不了」说出来，而不是只把选项灰掉 */
function findTransportBlocker(kind: ChatTransportKind): string | null {
  if (CHAT_TRANSPORTS[kind].isReady()) return null
  if (!findChatEndpoint()) return '未配置服务地址（构建时的 VITE_THINKING）'
  return '尚未登录'
}

export function ModelSection() {
  const transport = useAgentStore(function (state) {
    return state.settings.chat.transport
  })
  const approval = useAgentStore(function (state) {
    return state.settings.chat.approval
  })
  const providerID = useAgentStore(function (state) {
    return state.settings.chat.providerID
  })
  const model = useAgentStore(function (state) {
    return state.settings.chat.model
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  const kind = resolveChatTransport(transport)
  const blocker = findTransportBlocker(kind)
  const policy = APPROVAL_POLICIES.find(function (item) {
    return item.value === approval
  })

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="对话通路"
        hint="本地 provider 直连本机模型，密钥不出主进程；在线服务经 Thinking 转发，用当前登录令牌。">
        <SettingRow
          label="通路"
          hint={CHAT_TRANSPORTS[kind].hint}
          control={
            <Select
              value={kind}
              onValueChange={function (value) {
                void update('chat', { transport: value as ChatTransportKind })
              }}>
              <SelectTrigger
                className="w-40"
                aria-label="对话通路">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_TRANSPORT_KINDS.map(function (item) {
                  const meta = CHAT_TRANSPORTS[item]

                  return (
                    <SelectItem
                      key={item}
                      value={item}
                      disabled={!meta.isReady()}>
                      {meta.label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          }
        />

        {blocker ? (
          <p className="text-muted-foreground flex items-start gap-1.5 pb-2.5 text-xs">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {CHAT_TRANSPORTS.online.label}当前不可用：{blocker}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="工具审批"
        hint="决定 Agent 调用工具前是否需要你拍板；输入区右下角的快捷开关改的是同一项。">
        <SettingRow
          label="审批策略"
          hint={policy?.hint}
          control={
            <Select
              value={approval}
              onValueChange={function (value) {
                void update('chat', { approval: value as ApprovalPolicy })
              }}>
              <SelectTrigger
                className="w-40"
                aria-label="工具审批策略">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_POLICIES.map(function (item) {
                  return (
                    <SelectItem
                      key={item.value}
                      value={item.value}>
                      {item.label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="当前模型"
        hint="模型随会话走，所以切换在输入区右下角；这里只显示当前生效的值。">
        <SettingRow
          label="生效模型"
          control={
            <div className="flex items-center gap-2 text-sm">
              {kind === 'online' ? (
                <>
                  <span className="max-w-48 truncate">{model || '服务端默认'}</span>
                  <Badge
                    variant="secondary"
                    className="h-5 shrink-0 px-1.5 text-[11px]">
                    服务端配置
                  </Badge>
                </>
              ) : (
                <>
                  <span className="max-w-40 truncate">
                    {providerID ?? '自动选择首个启用的 provider'}
                  </span>
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span className="text-muted-foreground max-w-40 truncate">
                    {model || 'provider 默认模型'}
                  </span>
                </>
              )}
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="本地 Provider"
        hint="Qoder 把这页叫「模型 → 自定义模型」，说的是同一件事：密钥只写入主进程密钥库，不会再读回界面。">
        <div className="py-2.5">
          <ProviderPanel />
        </div>
      </SettingsSection>
    </div>
  )
}
