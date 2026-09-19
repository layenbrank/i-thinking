import { Button } from '@i-thinking/design/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@i-thinking/design/components/dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, ServerIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PROVIDER_KIND_LABELS } from '@/features/chat/provider/constants.ts'
import { ProviderForm, type ProviderRow } from '@/features/chat/provider/form.tsx'
import { parseModels, type ProviderValues } from '@/features/chat/provider/schema.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * 设置里的「模型」页，对照 Qoder：页头说明 + 添加模型，下面是个人模型列表。
 *
 * 添加和更新走对话框。行落 SQLite（`chat:provider.*`），Key 落主进程密钥库
 * （`assistant:key.*`，只有写 / 问有没有 / 删）。没有 Qoder CLI 的 Provider 目录，
 * 所以 Provider 是本机三种 OpenAI 兼容接入，服务地址由用户填写。
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

function findModelTitle(provider: ProviderRow): string {
  return provider.model || provider.name || '未命名模型'
}

function findModelHint(provider: ProviderRow): string {
  const kind = PROVIDER_KIND_LABELS[provider.kind] ?? provider.kind
  const vendor = provider.name && provider.name !== provider.model ? provider.name : kind
  return provider.enabled ? `${vendor} · 本机` : `${vendor} · 已停用`
}

function ProviderPanel() {
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
    onSuccess: async function (_id, input) {
      toast.success(input.id ? '已更新模型' : '已添加模型')
      closeForm()
      await refresh()
    },
    onError: function (error) {
      toast.error(toIpcMessage(error, '保存失败'))
    }
  })

  const removeMutation = useMutation({
    mutationFn: removeProvider,
    onSuccess: async function () {
      toast.success('已删除模型')
      await refresh()
    },
    onError: function (error) {
      toast.error(toIpcMessage(error, '删除失败'))
    }
  })

  const providers = providersQuery.data ?? []
  const isOpen = isCreating || editing !== null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-medium">模型</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            使用自己的 API Key 添加并管理个人模型。这些模型只在本机运行，密钥只写入主进程密钥库。
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0"
          onClick={function () {
            updateCreating(true)
          }}>
          <PlusIcon />
          添加模型
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">个人模型</h3>

        {providers.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">
            还没有个人模型。本地的 Ollama、LM Studio，或任意 OpenAI 兼容服务都可以加。
          </p>
        ) : (
          <div className="border-border divide-border divide-y rounded-lg border">
            {providers.map(function (provider) {
              return (
                <div
                  key={provider.id}
                  className="flex items-center gap-3 px-3 py-3">
                  <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                    <ServerIcon className="size-4" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{findModelTitle(provider)}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {findModelHint(provider)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={function () {
                      updateEditing(provider)
                    }}>
                    <PencilIcon />
                    更新 API Key
                  </Button>

                  <Button
                    type="button"
                    variant="destructive-outline"
                    size="sm"
                    disabled={removeMutation.isPending}
                    onClick={function () {
                      removeMutation.mutate(provider.id)
                    }}>
                    <TrashIcon />
                    删除
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={function (open) {
          if (!open) closeForm()
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '更新 API Key' : '添加模型'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `为「${findModelTitle(editing)}」输入新的 API Key。旧密钥不会显示，留空表示不修改。`
                : '选择本机接入的 Provider 和模型。调用走你填的服务地址，费用由该服务结算。'}
            </DialogDescription>
          </DialogHeader>
          <ProviderForm
            key={editing?.id ?? 'new'}
            provider={editing}
            isSaving={saveMutation.isPending}
            isUpdating={editing !== null}
            submitLabel={editing ? '更新 API Key' : '添加模型'}
            onSubmit={function (values) {
              saveMutation.mutate({ id: editing?.id ?? null, values })
            }}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ProviderPanel }
