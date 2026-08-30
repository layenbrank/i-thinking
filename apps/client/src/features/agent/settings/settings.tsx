/**
 * 模型接入设置：Modal 管理 OpenAI 兼容 / Ollama 接入
 */
import { Icon } from '@iconify/react/offline'
import { App, Button, Empty, Flex, Input, Modal, Popconfirm, Select, Switch } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { v4 as UUIDV4 } from 'uuid'

import { testConnection } from '@/features/agent/model/chat'
import { fetchOllamaModels } from '@/features/agent/model/ollama'
import {
  COMMON_BASE_URLS,
  parseModels,
  PROVIDER_KIND_META,
  stringifyModels
} from '@/features/agent/model/providers'
import styles from '@/features/agent/settings/settings.module.scss'
import {
  readApiKey,
  removeApiKey,
  resolveProviderConfig,
  writeApiKey
} from '@/features/agent/settings/use-providers'
import { useProviderStore, type AiProvider, type ProviderKind } from '@/stores/provider'

interface SettingsProps {
  open: boolean
  onClose: () => void
}

type ProbeStatus = 'unknown' | 'ok' | 'fail'

function AgentSettings(props: SettingsProps) {
  const { open, onClose } = props
  const { message } = App.useApp()
  const providers = useProviderStore(function (state) {
    return state.providers
  })
  const [testingID, updateTestingID] = useState<string | null>(null)
  const [refreshingID, updateRefreshingID] = useState<string | null>(null)
  const [probeStatus, updateProbeStatus] = useState<Record<string, ProbeStatus>>({})
  const [kind, updateKind] = useState<ProviderKind>('openai')
  const [name, updateName] = useState('')
  const [baseUrl, updateBaseUrl] = useState(PROVIDER_KIND_META.openai.defaultBaseUrl)
  const [apiKey, updateApiKey] = useState('')
  const [submitting, updateSubmitting] = useState(false)

  const meta = PROVIDER_KIND_META[kind]

  useEffect(
    function () {
      if (open) void useProviderStore.getState().toReadProviders()
    },
    [open]
  )

  function patchProbeStatus(providerID: string, status: ProbeStatus) {
    updateProbeStatus(function (prev) {
      return { ...prev, [providerID]: status }
    })
  }

  function clearProbeStatus(providerID: string) {
    updateProbeStatus(function (prev) {
      if (!(providerID in prev)) return prev
      const next = { ...prev }
      delete next[providerID]
      return next
    })
  }

  const baseUrlOptions = useMemo(function () {
    return COMMON_BASE_URLS.map(function (item) {
      return { label: item.label, value: item.baseUrl }
    })
  }, [])

  const kindOptions = useMemo(function () {
    return (Object.keys(PROVIDER_KIND_META) as ProviderKind[]).map(function (key) {
      return { label: PROVIDER_KIND_META[key].label, value: key }
    })
  }, [])

  function switchKind(next: ProviderKind) {
    updateKind(next)
    updateApiKey('')
    updateBaseUrl(PROVIDER_KIND_META[next].defaultBaseUrl)
  }

  async function handleAdd() {
    if (!name.trim()) {
      message.warning('请填写名称')
      return
    }
    if (meta.needsApiKey && !apiKey.trim()) {
      message.warning('请填写 API Key')
      return
    }
    updateSubmitting(true)
    try {
      const now = Date.now()
      const provider: AiProvider = {
        id: UUIDV4(),
        kind,
        name: name.trim(),
        baseUrl: baseUrl.trim() || meta.defaultBaseUrl,
        models: stringifyModels(meta.models),
        model: meta.models[0] ?? null,
        enabled: true,
        createdAt: now,
        updatedAt: now
      }
      if (kind === 'ollama') {
        try {
          const models = await fetchOllamaModels(provider.baseUrl!)
          if (models.length) {
            provider.models = stringifyModels(models)
            provider.model = models[0]
          }
        } catch {
          message.info('未检测到本地模型，可稍后在列表中刷新')
        }
      }
      await useProviderStore.getState().toWriteProvider([provider])
      if (meta.needsApiKey) await writeApiKey(provider.id, apiKey.trim())
      updateName('')
      updateApiKey('')
      message.success('已添加接入')
    } catch (error) {
      console.error('[agent-settings] handleAdd failed:', error)
      message.error('添加失败')
    } finally {
      updateSubmitting(false)
    }
  }

  async function handleTest(provider: AiProvider) {
    updateTestingID(provider.id)
    clearProbeStatus(provider.id)
    try {
      const config = await resolveProviderConfig(provider)
      await testConnection(config)
      patchProbeStatus(provider.id, 'ok')
      message.success(`${provider.name} 连接正常`)
    } catch (error) {
      console.error('[agent-settings] handleTest failed:', error)
      patchProbeStatus(provider.id, 'fail')
      message.error(`${provider.name} 连接失败`)
    } finally {
      updateTestingID(null)
    }
  }

  async function handleRefreshModels(provider: AiProvider) {
    updateRefreshingID(provider.id)
    try {
      const models = await fetchOllamaModels(provider.baseUrl ?? '')
      await useProviderStore.getState().toUpdateProvider([
        {
          id: provider.id,
          models: stringifyModels(models),
          model: models.includes(provider.model ?? '') ? provider.model : (models[0] ?? null)
        }
      ])
      message.success(`发现 ${models.length} 个模型`)
    } catch (error) {
      console.error('[agent-settings] handleRefreshModels failed:', error)
      message.error('刷新模型失败，请确认 Ollama 已启动')
    } finally {
      updateRefreshingID(null)
    }
  }

  async function handleRemove(provider: AiProvider) {
    await useProviderStore.getState().toRemoveProvider([provider.id])
    await removeApiKey(provider.id)
  }

  async function handleBaseUrlBlur(provider: AiProvider, value: string) {
    const next = value.trim() || PROVIDER_KIND_META[provider.kind].defaultBaseUrl
    if (next === (provider.baseUrl || '')) return
    clearProbeStatus(provider.id)
    await useProviderStore.getState().toUpdateProvider([{ id: provider.id, baseUrl: next }])
  }

  async function handleKeyBlur(provider: AiProvider, value: string) {
    if (!value.trim()) return
    await writeApiKey(provider.id, value.trim())
    message.success('API Key 已保存')
  }

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
            管理 OpenAI 兼容接口与本地 Ollama。启用后可在对话中选择对应模型。
          </p>
        </div>
      }
      onCancel={onClose}>
      <div className={styles.body}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>已添加</span>
            <span className={styles.sectionMeta}>{providers.length} 个接入</span>
          </div>

          {providers.length === 0 ? (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无接入，请在下方添加"
            />
          ) : (
            <div className={styles.list}>
              {providers.map(function (provider) {
                const kindMeta = PROVIDER_KIND_META[provider.kind]
                const models = parseModels(provider.models)
                const isTesting = testingID === provider.id
                const status = isTesting ? 'testing' : (probeStatus[provider.id] ?? 'unknown')
                return (
                  <article
                    key={provider.id}
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
                            icon={
                              provider.kind === 'ollama'
                                ? 'mdi:server'
                                : 'mdi:api'
                            }
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
                                status === 'testing' && styles.statusTesting
                              )}
                              title={
                                status === 'ok'
                                  ? '连接正常'
                                  : status === 'fail'
                                    ? '连接失败'
                                    : status === 'testing'
                                      ? '测试中'
                                      : '未测试'
                              }
                              aria-label={
                                status === 'ok'
                                  ? '连接正常'
                                  : status === 'fail'
                                    ? '连接失败'
                                    : status === 'testing'
                                      ? '测试中'
                                      : '未测试'
                              }
                            />
                            <span className={styles.cardName}>{provider.name}</span>
                            <span className={styles.kindPill}>{kindMeta.label}</span>
                            {status === 'ok' ? (
                              <span className={styles.statusLabelOk}>正常</span>
                            ) : null}
                            {status === 'fail' ? (
                              <span className={styles.statusLabelFail}>失败</span>
                            ) : null}
                          </Flex>
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
                          loading={testingID === provider.id}
                          onClick={function () {
                            void handleTest(provider)
                          }}>
                          测试
                        </Button>
                        {provider.kind === 'ollama' ? (
                          <Button
                            type="text"
                            size="small"
                            className={styles.iconBtn}
                            aria-label="刷新模型"
                            loading={refreshingID === provider.id}
                            icon={<Icon icon="mdi:refresh" width={16} height={16} />}
                            onClick={function () {
                              void handleRefreshModels(provider)
                            }}
                          />
                        ) : null}
                        <Popconfirm
                          title="删除该接入？"
                          description="不会删除已有对话，仅移除模型来源。"
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          onConfirm={function () {
                            void handleRemove(provider)
                          }}>
                          <Button
                            type="text"
                            size="small"
                            danger
                            className={styles.iconBtn}
                            aria-label="删除接入"
                            icon={<Icon icon="mdi:trash-can-outline" width={16} height={16} />}
                          />
                        </Popconfirm>
                        <Switch
                          size="small"
                          checked={provider.enabled}
                          onChange={function (enabled) {
                            void useProviderStore.getState().toUpdateProvider([
                              { id: provider.id, enabled }
                            ])
                          }}
                        />
                      </Flex>
                    </Flex>

                    <div className={styles.fields}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>服务地址</span>
                        <BaseUrlInput
                          provider={provider}
                          onCommit={handleBaseUrlBlur}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>默认模型</span>
                        <Select
                          showSearch
                          placeholder="选择模型"
                          value={provider.model ?? undefined}
                          options={models.map(function (model) {
                            return { label: model, value: model }
                          })}
                          onChange={function (model) {
                            clearProbeStatus(provider.id)
                            void useProviderStore.getState().toUpdateProvider([
                              { id: provider.id, model }
                            ])
                          }}
                        />
                      </label>
                      {kindMeta.needsApiKey ? (
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>API Key</span>
                          <ApiKeyInput
                            providerID={provider.id}
                            onCommit={handleKeyBlur}
                          />
                        </label>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>添加接入</span>
          </div>
          <div className={styles.addForm}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>类型</span>
              <Select
                value={kind}
                options={kindOptions}
                onChange={switchKind}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>名称</span>
              <Input
                placeholder="如：DeepSeek / 通义 / 本地 Ollama"
                value={name}
                onChange={function (event) {
                  updateName(event.target.value)
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>服务地址</span>
              {kind === 'openai' ? (
                <Select
                  value={baseUrl}
                  showSearch
                  options={baseUrlOptions}
                  onChange={updateBaseUrl}
                />
              ) : (
                <Input
                  placeholder={PROVIDER_KIND_META.ollama.defaultBaseUrl}
                  value={baseUrl}
                  onChange={function (event) {
                    updateBaseUrl(event.target.value)
                  }}
                />
              )}
            </label>
            {meta.needsApiKey ? (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>API Key</span>
                <Input.Password
                  placeholder="粘贴 API Key"
                  value={apiKey}
                  onChange={function (event) {
                    updateApiKey(event.target.value)
                  }}
                />
              </label>
            ) : null}
            <Button
              type="primary"
              className={styles.addBtn}
              icon={<Icon icon="mdi:plus" width={16} height={16} />}
              loading={submitting}
              onClick={function () {
                void handleAdd()
              }}>
              添加接入
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}

function BaseUrlInput(props: {
  provider: AiProvider
  onCommit: (provider: AiProvider, value: string) => void | Promise<void>
}) {
  const fallback = PROVIDER_KIND_META[props.provider.kind].defaultBaseUrl
  const stored = props.provider.baseUrl ?? fallback
  const [value, updateValue] = useState(stored)

  useEffect(
    function () {
      updateValue(stored)
    },
    [stored]
  )

  return (
    <Input
      value={value}
      placeholder={fallback}
      onChange={function (event) {
        updateValue(event.target.value)
      }}
      onBlur={function () {
        void props.onCommit(props.provider, value)
      }}
    />
  )
}

function ApiKeyInput(props: {
  providerID: string
  onCommit: (provider: AiProvider, value: string) => void | Promise<void>
}) {
  const [value, updateValue] = useState('')
  const [hasKey, updateHasKey] = useState(false)

  useEffect(
    function () {
      void readApiKey(props.providerID).then(function (key) {
        updateHasKey(Boolean(key))
      })
    },
    [props.providerID]
  )

  return (
    <Input.Password
      placeholder={hasKey ? '已配置（输入可覆盖）' : 'API Key'}
      value={value}
      onChange={function (event) {
        updateValue(event.target.value)
      }}
      onBlur={function () {
        if (!value.trim()) return
        const provider = useProviderStore.getState().providers.find(function (item) {
          return item.id === props.providerID
        })
        if (!provider) return
        void Promise.resolve(props.onCommit(provider, value)).then(function () {
          updateValue('')
          updateHasKey(true)
        })
      }}
    />
  )
}

export { AgentSettings }
export type { SettingsProps }
