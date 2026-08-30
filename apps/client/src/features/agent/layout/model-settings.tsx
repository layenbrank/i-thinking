/**
 * Qoder 风格模型设置：思考强度 / 显示状态 / 上下文窗口
 */
import { Icon } from '@iconify/react/offline'
import { App, Button, Flex, Modal, Select, Switch, Table, Typography } from 'antd'
import { clsx } from 'clsx'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from 'react'

import {
  canThink,
  CONTEXT_INDEX_MARKS,
  CONTEXT_STEPS,
  findContextByIndex,
  findContextIndex,
  findModelKey,
  findModelPref,
  MODEL_PREF,
  readModelPrefs,
  THINKING_OPTIONS,
  writeModelPrefs,
  type ModelPref,
  type ThinkingLevel
} from '@/features/agent/model/model-prefs'
import { parseModels, PROVIDER_KIND_META } from '@/features/agent/model/providers'
import styles from '@/features/agent/layout/model-settings.module.scss'
import { useProviderStore } from '@/stores/provider'

interface ModelSettingsProps {
  open: boolean
  onClose: () => void
  /** 跳转接入管理（无模型时） */
  onOpenProviders?: () => void
}

interface ModelRow {
  key: string
  providerID: string
  providerName: string
  providerKind: string
  model: string
  supportsThinking: boolean
}

interface ContextWindowControlProps {
  value: number
  onChange: (contextWindow: number) => void
}

interface RulerTick {
  key: string
  ratio: number
  major: boolean
  label?: string
}

const CONTEXT_LAST = CONTEXT_STEPS.length - 1
const RULER_MINOR_PER_GAP = 4

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value))
}

function findRatioByIndex(index: number) {
  if (CONTEXT_LAST <= 0) return 0
  return clampRatio(index / CONTEXT_LAST)
}

function findIndexByRatio(ratio: number) {
  return Math.round(clampRatio(ratio) * CONTEXT_LAST)
}

function buildRulerTicks(): RulerTick[] {
  const ticks: RulerTick[] = []
  for (let major = 0; major <= CONTEXT_LAST; major += 1) {
    const majorRatio = findRatioByIndex(major)
    ticks.push({
      key: `major-${major}`,
      ratio: majorRatio,
      major: true,
      label: CONTEXT_INDEX_MARKS[major]
    })
    if (major >= CONTEXT_LAST) continue
    const nextRatio = findRatioByIndex(major + 1)
    for (let minor = 1; minor <= RULER_MINOR_PER_GAP; minor += 1) {
      const t = minor / (RULER_MINOR_PER_GAP + 1)
      ticks.push({
        key: `minor-${major}-${minor}`,
        ratio: majorRatio + (nextRatio - majorRatio) * t,
        major: false
      })
    }
  }
  return ticks
}

const RULER_TICKS = buildRulerTicks()

function ContextWindowControl(props: ContextWindowControlProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [dragging, updateDragging] = useState(false)
  const [ratio, updateRatio] = useState(function () {
    return findRatioByIndex(findContextIndex(props.value))
  })

  const active = findIndexByRatio(ratio)
  const label = CONTEXT_INDEX_MARKS[active]

  useEffect(
    function () {
      if (draggingRef.current) return
      updateRatio(findRatioByIndex(findContextIndex(props.value)))
    },
    [props.value]
  )

  function findRatioFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return ratio
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return ratio
    return clampRatio((clientX - rect.left) / rect.width)
  }

  function commitRatio(nextRatio: number) {
    const parsed = clampRatio(nextRatio)
    updateRatio(parsed)
    props.onChange(findContextByIndex(findIndexByRatio(parsed)))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    draggingRef.current = true
    updateDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    commitRatio(findRatioFromClientX(event.clientX))
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    commitRatio(findRatioFromClientX(event.clientX))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    updateDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const snapped = findRatioByIndex(findIndexByRatio(findRatioFromClientX(event.clientX)))
    commitRatio(snapped)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      commitRatio(findRatioByIndex(Math.max(0, active - 1)))
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      commitRatio(findRatioByIndex(Math.min(CONTEXT_LAST, active + 1)))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      commitRatio(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      commitRatio(1)
    }
  }

  return (
    <div
      className={clsx(styles.contextControl, dragging && styles.contextDragging)}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={CONTEXT_LAST}
      aria-valuenow={active}
      aria-valuetext={label}
      aria-label="上下文窗口"
      onKeyDown={handleKeyDown}>
      <div
        ref={trackRef}
        className={styles.contextTrack}
        data-at-start={ratio <= 0 ? 'true' : undefined}
        data-at-end={ratio >= 1 ? 'true' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}>
        <span
          className={styles.contextFill}
          style={{ width: `${ratio * 100}%` }}
        />
        <span
          className={styles.contextThumb}
          style={{ left: `${ratio * 100}%` }}
        />
      </div>

      <div
        className={styles.contextRuler}
        aria-hidden>
        {RULER_TICKS.map(function (tick) {
          return (
            <span
              key={tick.key}
              className={clsx(
                styles.contextTick,
                tick.major ? styles.contextTickMajor : styles.contextTickMinor
              )}
              style={{ left: `${tick.ratio * 100}%` }}
            />
          )
        })}
      </div>

      <div
        className={styles.contextLabels}
        aria-hidden>
        {RULER_TICKS.filter(function (tick) {
          return tick.major
        }).map(function (tick) {
          const index = Math.round(tick.ratio * CONTEXT_LAST)
          return (
            <button
              key={tick.key}
              type="button"
              className={clsx(
                styles.contextLabel,
                index === active && styles.contextLabelActive
              )}
              style={{ left: `${tick.ratio * 100}%` }}
              onClick={function () {
                commitRatio(findRatioByIndex(index))
              }}>
              {tick.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AgentModelSettings(props: ModelSettingsProps) {
  const { message } = App.useApp()
  const providers = useProviderStore(function (state) {
    return state.providers
  })

  const [draft, updateDraft] = useState<Record<string, ModelPref>>({})
  const [saving, updateSaving] = useState(false)

  const rows = useMemo(function () {
    const result: ModelRow[] = []
    for (const provider of providers) {
      for (const model of parseModels(provider.models)) {
        result.push({
          key: findModelKey(provider.id, model),
          providerID: provider.id,
          providerName: provider.name,
          providerKind: PROVIDER_KIND_META[provider.kind].label,
          model,
          supportsThinking: canThink(model)
        })
      }
    }
    return result
  }, [providers])

  useEffect(
    function () {
      if (!props.open) return
      let cancelled = false
      void useProviderStore
        .getState()
        .toReadProviders()
        .then(function () {
          if (cancelled) return
          const prefs = readModelPrefs()
          const next: Record<string, ModelPref> = {}
          for (const provider of useProviderStore.getState().providers) {
            for (const model of parseModels(provider.models)) {
              const key = findModelKey(provider.id, model)
              next[key] = findModelPref(provider.id, model, prefs)
            }
          }
          updateDraft(next)
        })
      return function () {
        cancelled = true
      }
    },
    [props.open]
  )

  function patchPref(key: string, change: Partial<ModelPref>) {
    updateDraft(function (prev) {
      return {
        ...prev,
        [key]: {
          ...(prev[key] ?? { ...MODEL_PREF }),
          ...change
        }
      }
    })
  }

  function handleSave() {
    updateSaving(true)
    try {
      writeModelPrefs(draft)
      message.success('已保存模型设置')
      props.onClose()
    } finally {
      updateSaving(false)
    }
  }

  return (
    <Modal
      open={props.open}
      centered
      width={860}
      destroyOnHidden
      className={styles.modal}
      getContainer={function () {
        return document.body
      }}
      title={
        <div>
          <div className={styles.title}>模型设置</div>
          <p className={styles.desc}>
            这些偏好对所有任务生效。运行中的回复保持当前设置，下一轮开始使用新设置。
          </p>
        </div>
      }
      onCancel={props.onClose}
      footer={
        <Flex className={styles.footer}>
          <Button
            type="text"
            className={styles.cancelBtn}
            onClick={props.onClose}>
            取消
          </Button>
          <Button
            type="primary"
            className={styles.saveBtn}
            loading={saving}
            onClick={function () {
              handleSave()
            }}>
            保存设置
          </Button>
        </Flex>
      }>
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <Typography.Text type="secondary">暂无可用模型</Typography.Text>
          {props.onOpenProviders ? (
            <div className={styles.emptyAction}>
              <Button
                type="link"
                onClick={function () {
                  props.onClose()
                  props.onOpenProviders?.()
                }}>
                去添加模型接入
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <Table
          className={styles.table}
          size="middle"
          pagination={false}
          rowKey="key"
          dataSource={rows}
          columns={[
            {
              title: '模型名称',
              key: 'model',
              width: 240,
              render: function (_value, row) {
                return (
                  <Flex
                    align="center"
                    className={styles.modelCell}>
                    <span className={styles.modelBadge}>
                      <Icon
                        icon="mdi:cube-outline"
                        width={18}
                        height={18}
                      />
                    </span>
                    <Flex vertical>
                      <span className={styles.modelName}>{row.model}</span>
                      <span className={styles.modelMeta}>
                        {row.providerName} · {row.providerKind}
                      </span>
                    </Flex>
                  </Flex>
                )
              }
            },
            {
              title: '思考强度',
              key: 'thinking',
              width: 132,
              render: function (_value, row) {
                if (!row.supportsThinking) {
                  return <span className={styles.unsupported}>不支持</span>
                }
                const pref = draft[row.key] ?? MODEL_PREF
                return (
                  <Select
                    size="small"
                    variant="borderless"
                    className={styles.thinkingSelect}
                    value={pref.thinking}
                    options={THINKING_OPTIONS}
                    onChange={function (value: ThinkingLevel) {
                      patchPref(row.key, { thinking: value })
                    }}
                  />
                )
              }
            },
            {
              title: '显示状态',
              key: 'visible',
              width: 96,
              align: 'center',
              render: function (_value, row) {
                const pref = draft[row.key] ?? MODEL_PREF
                return (
                  <Switch
                    size="small"
                    checked={pref.visible}
                    onChange={function (checked) {
                      patchPref(row.key, { visible: checked })
                    }}
                  />
                )
              }
            },
            {
              title: '上下文窗口',
              key: 'context',
              width: 280,
              render: function (_value, row) {
                const pref = draft[row.key] ?? MODEL_PREF
                return (
                  <ContextWindowControl
                    value={pref.contextWindow}
                    onChange={function (contextWindow) {
                      patchPref(row.key, { contextWindow })
                    }}
                  />
                )
              }
            }
          ]}
        />
      )}
    </Modal>
  )
}

export { AgentModelSettings }
export type { ModelSettingsProps }
