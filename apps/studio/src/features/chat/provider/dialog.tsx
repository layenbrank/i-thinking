import { Button } from '@i-thinking/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@i-thinking/ui/dialog'
import { Switch } from '@i-thinking/ui/switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PROVIDER_KIND_LABELS } from '@/features/chat/provider/constants.ts'
import { ProviderForm, type ProviderRow } from '@/features/chat/provider/form.tsx'
import { parseModels, type ProviderValues } from '@/features/chat/provider/schema.ts'

import styles from '@/features/chat/provider/dialog.module.scss'

/**
 * Provider 设置：本地 provider（OpenAI 兼容端点）的增删改。
 *
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
  return <span className={styles.keyBadge}>已存 Key</span>
}

function ProviderDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  })

  const removeMutation = useMutation({
    mutationFn: removeProvider,
    onSuccess: async function () {
      toast.success('已删除 provider')
      await refresh()
    },
    onError: function (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: function (input: { id: string; enabled: boolean }) {
      return itc.chat.provider.toUpdate({ id: input.id, enabled: input.enabled })
    },
    onSuccess: refresh
  })

  const isEditing = isCreating || editing !== null
  const providers = providersQuery.data ?? []

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle>本地模型 Provider</DialogTitle>
          <DialogDescription>
            Ollama / LM Studio / 任意 OpenAI 兼容服务；Key 只留在主进程。
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <ProviderForm
            provider={editing}
            isSaving={saveMutation.isPending}
            onSubmit={function (values) {
              saveMutation.mutate({ id: editing?.id ?? null, values })
            }}
            onCancel={closeForm}
          />
        ) : (
          <div className={styles.list}>
            {providers.length === 0 && (
              <p className={styles.empty}>还没有 provider，先加一个本地服务。</p>
            )}

            {providers.map(function (provider) {
              return (
                <div
                  key={provider.id}
                  className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowName}>{provider.name}</span>
                    <span className={styles.rowMeta}>
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

            <div className={styles.listActions}>
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
        )}
      </DialogContent>
    </Dialog>
  )
}

export { ProviderDialog }
