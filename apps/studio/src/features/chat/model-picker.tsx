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
import { useEffect, useState } from 'react'

import { GET_MODELS, type GatewayModel } from '@/apis/gateway.ts'
import { canThink, findModelKey, findModelPref, readModelPrefs } from '@/features/chat/model-prefs.ts'
import { ModelSettings, type ModelRow } from '@/features/chat/model-settings.tsx'
import { findSelectedProvider, findUsableProviders } from '@/features/chat/port/model.ts'
import { resolveChatTransport } from '@/features/chat/transport.ts'
import { useAgentStore } from '@/stores/agent.ts'
import { HttpError } from '@/utils/http.errors.ts'

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

function findGatewayRows(models: GatewayModel[]): GatewayModel[] {
  return models.filter(function (item) {
    return item.enabled
  })
}

/**
 * 在线模型选择：目录来自 `GET /gateway/models`，写入的是模型 `name`（网关按名解析）。
 */
function OnlineModelPicker() {
  const [query, updateQuery] = useState('')
  const model = useAgentStore(function (state) {
    return state.settings.chat.model
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  const catalog = useQuery({
    queryKey: ['gateway', 'models'],
    queryFn: GET_MODELS
  })

  const rows = findGatewayRows(catalog.data ?? [])
  const firstName = rows[0]?.name
  const namesKey = rows
    .map(function (item) {
      return item.name
    })
    .join('\0')

  useEffect(
    function () {
      if (!firstName) return
      const current = model.trim()
      if (current && namesKey.split('\0').includes(current)) return
      void update('chat', { model: firstName, providerID: null })
    },
    [firstName, namesKey, model, update]
  )

  if (catalog.isLoading) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 max-w-52 justify-start px-2 text-xs"
        disabled>
        读取在线模型…
      </Button>
    )
  }

  if (catalog.isError) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-7 max-w-52 justify-start px-2 text-xs"
        title={HttpError(catalog.error).message}
        onClick={function () {
          void catalog.refetch()
        }}>
        <CircleAlertIcon />
        <span className="truncate">在线模型不可用</span>
      </Button>
    )
  }

  if (rows.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 max-w-52 justify-start px-2 text-xs"
        disabled
        title="服务端未配置可用模型">
        <CircleAlertIcon />
        <span className="truncate">暂无在线模型</span>
      </Button>
    )
  }

  const active =
    rows.find(function (item) {
      return item.name === model.trim()
    }) ?? rows[0]
  const keyword = query.trim().toLowerCase()
  const visible = rows.filter(function (item) {
    if (!keyword) return true
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.label.toLowerCase().includes(keyword)
    )
  })

  return (
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
          aria-label="选择在线模型"
          title={`${active.label} · ${active.name}`}>
          <span className="truncate">{active.label || active.name}</span>
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
            placeholder="搜索在线模型…"
            aria-label="搜索在线模型"
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
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              在线服务
            </DropdownMenuLabel>
            {visible.map(function (item) {
              const isActive = item.name === active.name
              return (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={function () {
                    void update('chat', { model: item.name, providerID: null })
                  }}>
                  <CheckIcon className={isActive ? 'text-primary' : 'opacity-0'} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{item.label}</span>
                    <span className="text-muted-foreground truncate text-[10px]">{item.name}</span>
                  </span>
                </DropdownMenuItem>
              )
            })}
            {visible.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-xs">没有匹配的模型</p>
            ) : null}
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
    return <OnlineModelPicker />
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
