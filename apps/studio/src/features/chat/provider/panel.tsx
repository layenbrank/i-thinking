import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Switch } from '@i-thinking/design/components/switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PROVIDER_KIND_LABELS } from '@/features/chat/provider/constants.ts'
import { ProviderForm, type ProviderRow } from '@/features/chat/provider/form.tsx'
import { parseModels, type ProviderValues } from '@/features/chat/provider/schema.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * Provider 配置面板：本地 provider（OpenAI 兼容端点）的增删改。
 *
 * 是**面板**不是 Dialog —— 外层弹窗由设置统一提供，这样设置入口只有一处。
 * apiKey 与 provider 行分开走：行落 SQLite（`chat:provider.*`），Key 落主进程密钥库
 * （`assistant:key.*`，只有写/问有没有/删）。
 */

const PROVIDERS_KEY = ['chat', 'providers'] as const

async function findProviders(): Promise<ProviderRow[]> {
  return await itc.chat.provider.toRead()
}

/** 新建/更新 provider，并在填了 Key 时写入密钥库 */
async function saveProvider(input: { id: string | null; values: ProviderValues }): Promise<string> {
  const { values } = input
  const payload = {
    kind: values.kind,
    name: values.name,
    baseUrl: values.baseUrl ? values.baseUrl : null,
    models: parseModels(values.models),
    model: values.model,
    enabled: values.enabled
  }

  const provider = input.id
    ? await itc.chat.provider.toUpdate({ id: input.id, ...payload })
    : await itc.chat.provider.toWrite(payload)

  if (values.apiKey) {
    await itc.assistant.key.toWrite({ providerID: provider.id, apiKey: values.apiKey })
  }
  return provider.id
}

async function removeProvider(id: string): Promise<void> {
  await itc.assistant.key.toRemove({ providerID: id })
  await itc.chat.provider.toRemove({ id })
}

function KeyBadge(props: { providerID: string }) {
  const keyQuery = useQuery({
    queryKey: ['chat', 'provider-key', props.providerID],
    queryFn: function () {
      return itc.assistant.key.has({ providerID: props.providerID })
    }
  })

  if (!keyQuery.data) return null
  return (
    <Badge
      variant="secondary"
      className="h-5 shrink-0 px-1.5 text-[11px]">
      已存 Key
    </Badge>
  )
}

export function ProviderPanel() {
  const [editing, updateEditing] = useState<ProviderRow | null>(null)
  const [isCreating, updateCreating] = useState(false)
  const queryClient = useQueryClient()

  const providersQuery = useQuery({ queryKey: PROVIDERS_KEY, queryFn: findProviders })

  function closeForm() {
    updateEditing(null)
    updateCreating(false)
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['chat'] })
  }

  const saveMutation = useMutation({
    mutationFn: saveProvider,
    onSuccess: async function () {
      toast.success('已保存 provider')
      closeForm()
      await refresh()
    },
    onError: function (error) {
      // 直接展示 error.message 会把 `[CODE] ` 前缀暴露给用户
      toast.error(toIpcMessage(error, '保存失败'))
    }
  })

  const removeMutation = useMutation({
    mutationFn: removeProvider,
    onSuccess: async function () {
      toast.success('已删除 provider')
      await refresh()
    },
    onError: function (error) {
      toast.error(toIpcMessage(error, '删除失败'))
    }
  })

  const toggleMutation = useMutation({
    mutationFn: function (input: { id: string; enabled: boolean }) {
      return itc.chat.provider.toUpdate({ id: input.id, enabled: input.enabled })
    },
    onSuccess: refresh
  })

  if (isCreating || editing !== null) {
    return (
      <ProviderForm
        provider={editing}
        isSaving={saveMutation.isPending}
        onSubmit={function (values) {
          saveMutation.mutate({ id: editing?.id ?? null, values })
        }}
        onCancel={closeForm}
      />
    )
  }

  const providers = providersQuery.data ?? []

  return (
    <div className="flex flex-col gap-2">
      {providers.length === 0 ? (
        <p className="text-muted-foreground py-4 text-sm">
          还没有 provider。本地的 Ollama / LM Studio，或任意 OpenAI 兼容服务都可以加。
        </p>
      ) : null}

      {providers.map(function (provider) {
        return (
          <div
            key={provider.id}
            className="border-border flex items-center gap-2.5 rounded-md border px-2.5 py-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{provider.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {PROVIDER_KIND_LABELS[provider.kind] ?? provider.kind} ·{' '}
                {provider.model ?? '未设默认模型'}
              </span>
            </div>

            <KeyBadge providerID={provider.id} />

            <Switch
              checked={provider.enabled}
              aria-label="启用"
              onCheckedChange={function (enabled) {
                toggleMutation.mutate({ id: provider.id, enabled })
              }}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () {
                updateEditing(provider)
              }}>
              编辑
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="删除"
              disabled={removeMutation.isPending}
              onClick={function () {
                removeMutation.mutate(provider.id)
              }}>
              <TrashIcon />
            </Button>
          </div>
        )
      })}

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={function () {
            updateCreating(true)
          }}>
          <PlusIcon />
          新建 provider
        </Button>
      </div>
    </div>
  )
}
