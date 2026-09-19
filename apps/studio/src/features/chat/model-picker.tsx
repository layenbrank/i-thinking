import { Button } from '@i-thinking/design/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'
import { Input } from '@i-thinking/design/components/input'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronDownIcon, CircleAlertIcon, SearchIcon, SettingsIcon } from 'lucide-react'
import { useState } from 'react'

import { canThink, findModelKey, findModelPref, readModelPrefs } from '@/features/chat/model-prefs.ts'
import { ModelSettings, type ModelRow } from '@/features/chat/model-settings.tsx'
import { findSelectedProvider, findUsableProviders } from '@/features/chat/port/model.ts'
import { resolveChatTransport } from '@/features/chat/transport.ts'
import { useAgentStore } from '@/stores/agent.ts'

/** 主进程 provider 行的展示类型（渲染进程不 import 主进程类型） */
type ProviderRow = Awaited<ReturnType<typeof itc.chat.provider.toRead>>[number]

interface ModelPickerProps {
  /** 没有可用 provider 时的出路：由 app 决定去哪儿（这里是设置页） */
  onOpenSettings?: () => void
}

/** provider 可选的模型：默认模型 + 模型列表（去重） */
function collectModels(provider: ProviderRow): string[] {
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
 * 模型选择：provider + 模型合成一个下拉。
 * 「模型设置」打开偏好弹层（Qoder 的表格），不跳设置页。没配 provider 时才去设置页加接入。
 */
export function ModelPicker(props: ModelPickerProps) {
  const [query, updateQuery] = useState('')
  const [isSettingsOpen, updateSettingsOpen] = useState(false)
  const [prefs, updatePrefs] = useState(readModelPrefs)
  const transport = useAgentStore(function (state) {
    return state.settings.chat.transport
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
  const providers = useQuery({
    queryKey: ['chat', 'providers'],
    queryFn: async function () {
      return itc.chat.provider.toRead()
    },
    enabled: kind === 'offline'
  })

  if (kind === 'online') {
    return (
      <Input
        className="hover:border-border h-7 w-36 border-transparent bg-transparent text-xs shadow-none"
        value={model}
        placeholder="服务端默认模型"
        aria-label="在线模型"
        onChange={function (event) {
          void update('chat', { model: event.target.value })
        }}
      />
    )
  }

  const usable = findUsableProviders(providers.data ?? [])
  if (usable.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-7 max-w-52 justify-start px-2 text-xs"
        aria-label="选择模型"
        title={providers.isLoading ? '正在读取 provider…' : '未配置本地 provider，点这里去设置'}
        disabled={providers.isLoading}
        onClick={props.onOpenSettings}>
        <CircleAlertIcon />
        <span className="truncate">{providers.isLoading ? '读取模型…' : '选择模型'}</span>
      </Button>
    )
  }

  const selected = findSelectedProvider(usable, { providerID, model })
  const activeModel = model.trim() || selected?.model || selected?.models?.[0] || ''
  const keyword = query.trim().toLowerCase()

  function pick(nextProviderID: string, nextModel: string) {
    void update('chat', { providerID: nextProviderID, model: nextModel })
  }

  const rows: ModelRow[] = usable.flatMap(function (provider) {
    return collectModels(provider).map(function (item) {
      return {
        key: findModelKey(provider.id, item),
        providerID: provider.id,
        providerName: provider.name,
        model: item,
        canThink: canThink(item)
      }
    })
  })

  return (
    <>
    <DropdownMenu
      onOpenChange={function (open) {
        if (!open) updateQuery('')
      }}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 max-w-52 justify-start gap-1 px-2 text-xs"
          aria-label="选择模型"
          title={selected ? `${selected.name} · ${activeModel}` : undefined}>
          <span className="truncate">{activeModel || '选择模型'}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 p-0">
        <div className="border-border relative border-b p-2">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            placeholder="搜索模型…"
            aria-label="搜索模型"
            className="h-8 ps-8 text-xs"
            onKeyDown={function (event) {
              event.stopPropagation()
            }}
            onChange={function (event) {
              updateQuery(event.target.value)
            }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {usable.map(function (provider) {
            const models = collectModels(provider).filter(function (item) {
              if (!findModelPref(provider.id, item, prefs).isVisible) return false
              if (!keyword) return true
              return (
                item.toLowerCase().includes(keyword) ||
                provider.name.toLowerCase().includes(keyword)
              )
            })
            if (models.length === 0) return null

            return (
              <DropdownMenuGroup key={provider.id}>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {provider.name}
                </DropdownMenuLabel>

                {models.map(function (item) {
                  const isActive = provider.id === selected?.id && item === activeModel

                  return (
                    <DropdownMenuItem
                      key={item}
                      onSelect={function () {
                        pick(provider.id, item)
                      }}>
                      <CheckIcon className={isActive ? 'text-primary' : 'opacity-0'} />
                      <span className="truncate">{item}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            )
          })}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1">
          <DropdownMenuItem
            onSelect={function () {
              updateSettingsOpen(true)
            }}>
            <SettingsIcon />
            模型设置
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    <ModelSettings
      open={isSettingsOpen}
      rows={rows}
      onOpenProviders={props.onOpenSettings}
      onOpenChange={function (open) {
        updateSettingsOpen(open)
        if (!open) updatePrefs(readModelPrefs())
      }}
    />
    </>
  )
}
