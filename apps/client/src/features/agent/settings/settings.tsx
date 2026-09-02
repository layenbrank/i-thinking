/**
 * 模型接入设置：goose inventory 网格 + 动态 configKeys（对齐 Desktop）
 */
import { Icon } from '@iconify/react/offline'
import { App, Button, Empty, Flex, Input, Modal, Select, Spin } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'

import { findAcpHandle } from '@/features/agent/acp/connection'
import {
  checkAcpReadiness,
  enableAcpProvider,
  fetchGooseProviders,
  fetchProviderConfig,
  findSettingsProviders,
  parseConfigFields,
  saveDefaults,
  saveProviderConfig,
  type GooseConfigKey,
  type GooseProviderEntry
} from '@/features/agent/acp/goose-providers'
import { waitGooseReady } from '@/features/agent/model/goose-acp'
import { parseModels, stringifyModels } from '@/features/agent/model/providers'
import styles from '@/features/agent/settings/settings.module.scss'
import { readApiKey, writeApiKey } from '@/features/agent/settings/use-providers'
import { useProviderStore, type AiProvider } from '@/stores/provider'

interface SettingsProps {
  open: boolean
  onClose: () => void
}

type ProbeStatus = 'unknown' | 'ok' | 'fail'

function findHostValue(values: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(values)) {
    if (!value.trim()) continue
    if (/HOST|_URL|API_URL/i.test(key)) return value.trim()
  }
  return null
}

function findSecretKey(configKeys: GooseConfigKey[]): string | null {
  const secret = configKeys.find(function (key) {
    return key.secret
  })
  return secret?.name ?? null
}

async function upsertStoreProvider(
  entry: GooseProviderEntry,
  values: Record<string, string>
): Promise<void> {
  const store = useProviderStore.getState()
  const existing = store.providers.find(function (provider) {
    return provider.id === entry.providerId || provider.kind === entry.providerId
  })
  const models = entry.models
  const keepModel =
    existing?.model && models.includes(existing.model)
      ? existing.model
      : entry.defaultModel && models.includes(entry.defaultModel)
        ? entry.defaultModel
        : (models[0] ?? null)
  const baseUrl = findHostValue(values) ?? existing?.baseUrl ?? null
  const now = Date.now()

  // 统一 id = providerId；迁移历史 UUID 行
  if (existing && existing.id !== entry.providerId) {
    const oldKey = await readApiKey(existing.id)
    if (oldKey) await writeApiKey(entry.providerId, oldKey)
    await store.toRemoveProvider([existing.id])
  } else if (existing) {
    await store.toUpdateProvider([
      {
        id: existing.id,
        kind: entry.providerId,
        name: entry.providerName,
        baseUrl,
        models: stringifyModels(models),
        model: keepModel,
        enabled: true,
        updatedAt: now
      }
    ])
    return
  }

  const stillThere = store.providers.some(function (provider) {
    return provider.id === entry.providerId
  })
  if (stillThere) {
    await store.toUpdateProvider([
      {
        id: entry.providerId,
        kind: entry.providerId,
        name: entry.providerName,
        baseUrl,
        models: stringifyModels(models),
        model: keepModel,
        enabled: true,
        updatedAt: now
      }
    ])
    return
  }

  const row: AiProvider = {
    id: entry.providerId,
    kind: entry.providerId,
    name: entry.providerName,
    baseUrl,
    models: stringifyModels(models),
    model: keepModel,
    enabled: entry.configured,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  await store.toWriteProvider([row])
}

function AgentSettings(props: SettingsProps) {
  const { open, onClose } = props
  const { message } = App.useApp()
  const [loading, updateLoading] = useState(false)
  const [entries, updateEntries] = useState<GooseProviderEntry[]>([])
  const [activeId, updateActiveId] = useState<string | null>(null)
  const [formValues, updateFormValues] = useState<Record<string, string>>({})
  const [saving, updateSaving] = useState(false)
  const [probeStatus, updateProbeStatus] = useState<Record<string, ProbeStatus>>({})

  const active = entries.find(function (entry) {
    return entry.providerId === activeId
  })

  async function loadInventory() {
    updateLoading(true)
    try {
      await waitGooseReady()
      const handle = await findAcpHandle()
      const all = await fetchGooseProviders(handle.connection)
      const visible = findSettingsProviders(all)
      updateEntries(visible)

      const store = useProviderStore.getState()
      await store.toReadProviders()
      for (const entry of visible) {
        if (!entry.configured) continue
        await upsertStoreProvider(entry, {})
      }
    } catch (error) {
      console.error('[agent-settings] loadInventory failed:', error)
      const detail = error instanceof Error ? error.message : '加载失败'
      message.error(detail)
    } finally {
      updateLoading(false)
    }
  }

  useEffect(
    function () {
      if (!open) return
      updateActiveId(null)
      updateFormValues({})
      void loadInventory()
    },
    [open]
  )

  async function openEditor(entry: GooseProviderEntry) {
    updateActiveId(entry.providerId)
    const initial: Record<string, string> = {}
    for (const key of entry.configKeys) {
      initial[key.name] = key.default?.trim() || ''
    }

    try {
      await waitGooseReady()
      const handle = await findAcpHandle()
      const fields = await fetchProviderConfig(handle.connection, entry.providerId)
      for (const field of fields) {
        if (field.value) initial[field.key] = field.value
      }
      const secretName = findSecretKey(entry.configKeys)
      if (secretName && !initial[secretName]) {
        const stored = await readApiKey(entry.providerId)
        if (stored) initial[secretName] = stored
      }
    } catch (error) {
      console.warn('[agent-settings] 读取已有配置失败:', error)
    }

    updateFormValues(initial)
  }

  function patchField(name: string, value: string) {
    updateFormValues(function (prev) {
      return { ...prev, [name]: value }
    })
  }

  function patchProbe(providerId: string, status: ProbeStatus) {
    updateProbeStatus(function (prev) {
      return { ...prev, [providerId]: status }
    })
  }

  async function handleSave() {
    if (!active) return
    updateSaving(true)
    patchProbe(active.providerId, 'unknown')
    try {
      await waitGooseReady()
      const handle = await findAcpHandle()
      const fields = parseConfigFields(active.configKeys, formValues)

      for (const key of active.configKeys) {
        if (!key.required) continue
        if (key.secret && formValues[key.name]?.trim()) continue
        if (!fields.some(function (field) {
          return field.key === key.name
        })) {
          // 已配置供应商允许空 secret（goose 侧已有）
          if (active.configured && key.secret) continue
          message.warning(`请填写 ${key.name}`)
          updateSaving(false)
          return
        }
      }

      let entry: GooseProviderEntry
      if (active.isAcp && fields.length === 0) {
        entry = await enableAcpProvider(handle.connection, active.providerId)
        const readiness = await checkAcpReadiness(handle.connection, active.providerId)
        if (!readiness.ready) {
          throw new Error(readiness.error || 'ACP 供应商未就绪')
        }
      } else {
        entry = await saveProviderConfig(handle.connection, active.providerId, fields)
        if (entry.isAcp) {
          const readiness = await checkAcpReadiness(handle.connection, active.providerId)
          if (!readiness.ready) {
            throw new Error(readiness.error || 'ACP 供应商未就绪')
          }
        }
      }

      const secretName = findSecretKey(active.configKeys)
      if (secretName) {
        const secretValue = formValues[secretName]?.trim()
        if (secretValue) await writeApiKey(active.providerId, secretValue)
      }

      await upsertStoreProvider(entry, formValues)
      const model = entry.defaultModel || entry.models[0] || null
      try {
        await saveDefaults(handle.connection, entry.providerId, model)
      } catch (error) {
        console.warn('[agent-settings] defaultsSave 跳过:', error)
      }

      useProviderStore.getState().toSetActiveProvider(entry.providerId)
      if (model) {
        await useProviderStore.getState().toUpdateProvider([
          { id: entry.providerId, model }
        ])
      }

      patchProbe(entry.providerId, 'ok')
      message.success(`${entry.providerName} 已保存至 goose`)
      await loadInventory()
      updateActiveId(entry.providerId)
    } catch (error) {
      console.error('[agent-settings] handleSave failed:', error)
      patchProbe(active.providerId, 'fail')
      const detail = error instanceof Error ? error.message : '保存失败'
      message.error(`${active.providerName}：${detail}`)
    } finally {
      updateSaving(false)
    }
  }

  async function handleModelChange(providerId: string, model: string) {
    await useProviderStore.getState().toUpdateProvider([{ id: providerId, model }])
    try {
      await waitGooseReady()
      const handle = await findAcpHandle()
      await saveDefaults(handle.connection, providerId, model)
    } catch (error) {
      console.warn('[agent-settings] 切换默认模型失败:', error)
    }
  }

  const storeProviders = useProviderStore(function (state) {
    return state.providers
  })

  return (
    <Modal
      open={open}
      centered
      width={720}
      destroyOnHidden
      className={styles.modal}
      footer={null}
      getContainer={function () {
        return document.body
      }}
      title={
        <div>
          <div className={styles.title}>模型接入</div>
          <p className={styles.desc}>
            供应商来自 goose inventory。配置写入 goose 后，可在对话中切换已启用的模型。
          </p>
        </div>
      }
      onCancel={onClose}>
      <div className={styles.body}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>供应商</span>
            <span className={styles.sectionMeta}>
              {loading ? '加载中…' : `${entries.length} 个`}
            </span>
          </div>

          {loading ? (
            <Flex
              justify="center"
              style={{ padding: 24 }}>
              <Spin />
            </Flex>
          ) : entries.length === 0 ? (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="goose inventory 为空，请确认 goose serve 已启动"
            />
          ) : (
            <div className={styles.list}>
              {entries.map(function (entry) {
                const status = probeStatus[entry.providerId] ?? 'unknown'
                const storeRow = storeProviders.find(function (provider) {
                  return provider.id === entry.providerId || provider.kind === entry.providerId
                })
                const models = entry.models.length
                  ? entry.models
                  : parseModels(storeRow?.models ?? null)
                const isOpen = activeId === entry.providerId
                return (
                  <article
                    key={entry.providerId}
                    className={styles.card}>
                    <Flex
                      align="center"
                      justify="space-between"
                      gap={12}
                      className={styles.cardHeader}>
                      <Flex
                        align="center"
                        gap={10}
                        className={styles.cardIdentity}>
                        <span className={styles.cardBadge}>
                          <Icon
                            icon={entry.isAcp ? 'mdi:console' : 'mdi:api'}
                            width={18}
                            height={18}
                          />
                        </span>
                        <Flex vertical gap={2}>
                          <Flex
                            align="center"
                            gap={8}>
                            <span
                              className={clsx(
                                styles.statusDot,
                                status === 'ok' && styles.statusOk,
                                status === 'fail' && styles.statusFail,
                                entry.configured && status === 'unknown' && styles.statusOk
                              )}
                            />
                            <span className={styles.cardName}>{entry.providerName}</span>
                            <span className={styles.kindPill}>{entry.providerId}</span>
                            {entry.configured ? (
                              <span className={styles.statusLabelOk}>已配置</span>
                            ) : null}
                            {entry.isAcp ? (
                              <span className={styles.kindPill}>ACP</span>
                            ) : null}
                          </Flex>
                          {entry.description ? (
                            <p className={styles.fieldHint}>{entry.description}</p>
                          ) : null}
                        </Flex>
                      </Flex>

                      <Flex
                        align="center"
                        gap={4}
                        className={styles.cardActions}>
                        <Button
                          type="text"
                          size="small"
                          className={styles.actionBtn}
                          onClick={function () {
                            if (isOpen) {
                              updateActiveId(null)
                              return
                            }
                            void openEditor(entry)
                          }}>
                          {isOpen ? '收起' : entry.configured ? '编辑' : '配置'}
                        </Button>
                      </Flex>
                    </Flex>

                    {entry.configured && models.length > 0 ? (
                      <div className={styles.fields}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>默认模型</span>
                          <Select
                            showSearch
                            placeholder="选择模型"
                            value={storeRow?.model ?? models[0]}
                            options={models.map(function (model) {
                              return { label: model, value: model }
                            })}
                            onChange={function (model) {
                              void handleModelChange(entry.providerId, model)
                            }}
                          />
                        </label>
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className={styles.addForm}>
                        {entry.setupSteps.length > 0 ? (
                          <p className={styles.fieldHint}>{entry.setupSteps.join(' · ')}</p>
                        ) : null}
                        {entry.configKeys.length === 0 ? (
                          <p className={styles.fieldHint}>
                            {entry.isAcp
                              ? '此 ACP 供应商无需额外字段，保存将启用并探测就绪。'
                              : '此供应商无需配置字段。'}
                          </p>
                        ) : (
                          entry.configKeys.map(function (key) {
                            return (
                              <label
                                key={key.name}
                                className={styles.field}>
                                <span className={styles.fieldLabel}>
                                  {key.name}
                                  {key.required ? ' *' : ''}
                                </span>
                                {key.secret ? (
                                  <Input.Password
                                    placeholder={
                                      entry.configured ? '已配置（输入可覆盖）' : '密钥'
                                    }
                                    value={formValues[key.name] ?? ''}
                                    onChange={function (event) {
                                      patchField(key.name, event.target.value)
                                    }}
                                  />
                                ) : (
                                  <Input
                                    placeholder={key.default ?? key.name}
                                    value={formValues[key.name] ?? ''}
                                    onChange={function (event) {
                                      patchField(key.name, event.target.value)
                                    }}
                                  />
                                )}
                              </label>
                            )
                          })
                        )}
                        <Button
                          type="primary"
                          className={styles.addBtn}
                          loading={saving}
                          onClick={function () {
                            void handleSave()
                          }}>
                          保存到 goose
                        </Button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

export { AgentSettings }
export type { SettingsProps }
