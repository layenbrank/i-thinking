import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Switch } from '@i-thinking/design/components/switch'

import { useAgentStore, type DurationFormat } from '@/stores/agent.ts'
import { SettingRow, SettingsSection } from '@/views/agent/settings/components/section.tsx'

/**
 * 常规：对话区怎么渲染。
 *
 * 每个开关都有真实的消费者（工具折叠条 / 回复过程折叠条），不是摆设 ——
 * 点了没反应的控件比缺一个开关更糟。
 */
export function GeneralSection() {
  const chat = useAgentStore(function (state) {
    return state.settings.chat
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  return (
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
  )
}
