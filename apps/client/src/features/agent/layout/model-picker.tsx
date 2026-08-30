/**
 * 模型浮层选择器：按接入分组列表 + 模型设置
 */
import { Icon } from '@iconify/react/offline'
import { Button, Flex, Popover, Typography } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'

import { AgentModelSettings } from '@/features/agent/layout/model-settings'
import styles from '@/features/agent/layout/model-picker.module.scss'
import { findModelPref, readModelPrefs } from '@/features/agent/model/model-prefs'
import { parseModels, PROVIDER_KIND_META } from '@/features/agent/model/providers'
import { useProviderStore } from '@/stores/provider'

interface ModelPickerProps {
  /** 挂载浮层的容器，避免 Tauri 窗口定位问题 */
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement
  /** 跳转接入管理（模型设置空态） */
  onOpenSettings?: () => void
  children: ReactNode
}

function AgentModelPicker(props: ModelPickerProps) {
  const [open, updateOpen] = useState(false)
  const [settingsOpen, updateSettingsOpen] = useState(false)
  const [prefsTick, updatePrefsTick] = useState(0)
  const providers = useProviderStore(function (state) {
    return state.providers
  })
  const activeProviderID = useProviderStore(function (state) {
    return state.activeProviderID
  })

  const enabledProviders = providers.filter(function (provider) {
    return provider.enabled
  })

  const prefs = useMemo(
    function () {
      return readModelPrefs()
    },
    [prefsTick, settingsOpen]
  )

  return (
    <>
      <Popover
        trigger="click"
        open={open}
        onOpenChange={updateOpen}
        placement="topLeft"
        arrow={false}
        getPopupContainer={props.getPopupContainer}
        styles={{
          container: {
            padding: 0,
            border: 'none',
            background: 'transparent',
            boxShadow: 'none'
          }
        }}
        content={
          <div className={styles.panel}>
            <div className={styles.header}>
              <p className={styles.headerTitle}>模型</p>
              <p className={styles.hint}>选择当前对话使用的接入与模型</p>
            </div>
            <div className={styles.list}>
              {enabledProviders.length === 0 ? (
                <Typography.Text
                  type="secondary"
                  className={styles.empty}>
                  请先在设置中添加模型接入
                </Typography.Text>
              ) : (
                enabledProviders.map(function (provider) {
                  const kindLabel = PROVIDER_KIND_META[provider.kind].label
                  const models = parseModels(provider.models).filter(function (model) {
                    return findModelPref(provider.id, model, prefs).visible
                  })
                  if (models.length === 0) return null
                  return (
                    <div
                      key={provider.id}
                      className={styles.group}>
                      <div className={styles.groupTitle}>
                        {provider.name}
                        <span className={styles.kind}>{kindLabel}</span>
                      </div>
                      {models.map(function (model) {
                        const isActive =
                          provider.id === activeProviderID && provider.model === model
                        return (
                          <button
                            key={`${provider.id}-${model}`}
                            type="button"
                            className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                            onClick={function () {
                              useProviderStore.getState().toSetActiveProvider(provider.id)
                              void useProviderStore.getState().toUpdateProvider([
                                { id: provider.id, model }
                              ])
                              updateOpen(false)
                            }}>
                            {isActive ? (
                              <Icon
                                icon="mdi:check"
                                className={styles.check}
                                width={16}
                                height={16}
                              />
                            ) : (
                              <span className={styles.checkSlot} />
                            )}
                            <span className={styles.modelBadge}>
                              <Icon
                                icon="mdi:cube-outline"
                                width={16}
                                height={16}
                              />
                            </span>
                            <Flex
                              vertical
                              className={styles.rowBody}>
                              <span className={styles.modelName}>{model}</span>
                              <span className={styles.modelDesc}>
                                {provider.name} · {kindLabel}
                              </span>
                            </Flex>
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
            <div className={styles.footer}>
              <Button
                type="text"
                block
                className={styles.settingsBtn}
                icon={<Icon icon="mdi:cog-outline" width={16} height={16} />}
                onClick={function () {
                  updateOpen(false)
                  updateSettingsOpen(true)
                }}>
                模型设置
              </Button>
            </div>
          </div>
        }>
        {props.children}
      </Popover>

      <AgentModelSettings
        open={settingsOpen}
        onClose={function () {
          updateSettingsOpen(false)
          updatePrefsTick(function (tick) {
            return tick + 1
          })
        }}
        onOpenProviders={props.onOpenSettings}
      />
    </>
  )
}

export { AgentModelPicker }
export type { ModelPickerProps }
