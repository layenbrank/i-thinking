import { Input } from '@i-thinking/design/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'

import { findSelectedProvider, findUsableProviders } from '@/features/chat/port/model.ts'
import { resolveChatTransport } from '@/features/chat/transport.ts'
import { useSettingsStore } from '@/stores/setting.ts'

import styles from '@/views/chat/chat.module.scss'

/** 主进程 provider 行的展示类型（渲染进程不 import 主进程类型） */
type ProviderRow = Awaited<ReturnType<typeof itc.chat.provider.toRead>>[number]

/** provider 可选的模型：默认模型 + 模型列表（去重） */
function collectModels(provider: ProviderRow | null): string[] {
  if (!provider) return []

  const models = provider.models ?? []
  if (!provider.model) return models

  return [
    provider.model,
    ...models.filter(function (item) {
      return item !== provider.model
    })
  ]
}

/**
 * 模型选择：离线从 provider 列表里选（provider + 模型），在线只填模型名（provider 由服务端 env 决定）。
 * 写入设置存储 `chat`，端口/传输层在每次运行时现读。
 */
export function ModelPicker() {
  const transport = useSettingsStore(function (state) {
    return state.settings.chat.transport
  })
  const providerID = useSettingsStore(function (state) {
    return state.settings.chat.providerID
  })
  const model = useSettingsStore(function (state) {
    return state.settings.chat.model
  })
  const update = useSettingsStore(function (state) {
    return state.update
  })

  const kind = resolveChatTransport(transport)
  const providers = useQuery({
    queryKey: ['chat', 'providers'],
    queryFn: async function () {
      return itc.chat.provider.toRead()
    },
    enabled: kind === 'offline'
  })

  function writeModel(value: string): void {
    void update('chat', { model: value })
  }

  if (kind === 'online') {
    return (
      <Input
        className={clsx(styles.modelInput)}
        value={model}
        placeholder="服务端默认模型"
        aria-label="在线模型"
        onChange={function (event) {
          writeModel(event.target.value)
        }}
      />
    )
  }

  const usable = findUsableProviders(providers.data ?? [])
  if (usable.length === 0) {
    return <span className={clsx(styles.modelHint)}>未配置可用的本地 provider</span>
  }

  const selected = findSelectedProvider(usable, { providerID, model })
  const models = collectModels(selected)

  return (
    <div className={clsx(styles.modelPicker)}>
      <Select
        value={selected?.id ?? ''}
        onValueChange={function (value) {
          void update('chat', { providerID: value, model: '' })
        }}>
        <SelectTrigger
          className={clsx(styles.modelTrigger)}
          aria-label="本地 provider">
          <SelectValue placeholder="选择 provider" />
        </SelectTrigger>
        <SelectContent>
          {usable.map(function (provider) {
            return (
              <SelectItem
                key={provider.id}
                value={provider.id}>
                {provider.name}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <Select
        value={model || models[0] || ''}
        onValueChange={writeModel}>
        <SelectTrigger
          className={clsx(styles.modelTrigger)}
          aria-label="本地模型">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {models.map(function (item) {
            return (
              <SelectItem
                key={item}
                value={item}>
                {item}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
