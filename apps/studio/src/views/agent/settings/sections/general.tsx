import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Switch } from '@i-thinking/design/components/switch'
import { CircleAlertIcon } from 'lucide-react'

import { APPROVAL_POLICIES, type ApprovalPolicy } from '@/features/chat/approval.ts'
import {
  CHAT_TRANSPORT_KINDS,
  CHAT_TRANSPORTS,
  findChatEndpoint,
  resolveChatTransport,
  type ChatTransportKind
} from '@/features/chat/transport.ts'
import { useAgentStore, type DurationFormat } from '@/stores/agent.ts'
import { SettingRow, SettingsSection } from '@/views/agent/settings/components/section.tsx'

/** 通路不可用的具体原因：把「为什么点不了」说出来，而不是只把选项灰掉 */
function findTransportBlocker(kind: ChatTransportKind): string | null {
  if (CHAT_TRANSPORTS[kind].isReady()) return null
  if (!findChatEndpoint()) return '未配置服务地址（构建时的 VITE_THINKING）'
  return '尚未登录'
}

/**
 * 常规：对话区怎么渲染，以及通路、审批。
 *
 * 每个开关都有真实的消费者，不是摆设。通路和审批原先堆在「模型」页，
 * Qoder 的模型页只放个人模型，所以挪到这里。
 */
export function GeneralSection() {
  const chat = useAgentStore(function (state) {
    return state.settings.chat
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  const kind = resolveChatTransport(chat.transport)
  const blocker = findTransportBlocker(kind)
  const policy = APPROVAL_POLICIES.find(function (item) {
    return item.value === chat.approval
  })

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="常规"
        hint="这些开关直接决定对话区的渲染方式，改完立刻生效。">
        <SettingRow
          label="默认展开工具调用"
          hint="关掉后工具只显示一行摘要，点开才看参数与结果。"
          control={
            <Switch
              checked={chat.expandTools}
              aria-label="默认展开工具调用"
              onCheckedChange={function (checked) {
                void update('chat', { expandTools: checked })
              }}
            />
          }
        />

        <SettingRow
          label="显示工具调用次数"
          hint="关掉后折叠条只说「执行工具」，不播报次数与失败数。"
          control={
            <Switch
              checked={chat.showToolCount}
              aria-label="显示工具调用次数"
              onCheckedChange={function (checked) {
                void update('chat', { showToolCount: checked })
              }}
            />
          }
        />

        <SettingRow
          label="折叠回复过程"
          hint="回合结束后把推理与工具收成一行；关掉则保持展开。"
          control={
            <Switch
              checked={chat.collapseProcess}
              aria-label="折叠回复过程"
              onCheckedChange={function (checked) {
                void update('chat', { collapseProcess: checked })
              }}
            />
          }
        />

        <SettingRow
          label="耗时显示格式"
          hint="回合摘要里的秒数怎么取整。"
          control={
            <Select
              value={chat.durationFormat}
              onValueChange={function (value) {
                void update('chat', { durationFormat: value as DurationFormat })
              }}>
              <SelectTrigger
                className="w-36"
                aria-label="耗时显示格式">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="integer">整数秒</SelectItem>
                <SelectItem value="precise">精确到 0.1 秒</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsSection>

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
              value={chat.approval}
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
    </div>
  )
}
