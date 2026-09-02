/**
 * Agent 工作台：标题栏 + Splitter（工作区 | 主对话 | Plan）
 */
import { Splitter } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'

import styles from '@/features/agent/agent.module.scss'
import { AgentPlanPane, type PlanPaneSource } from '@/features/agent/layout/plan-pane'
import { AgentSidebar } from '@/features/agent/layout/sidebar'
import {
  findSplitterSizes,
  PLAN_MAX,
  PLAN_MIN,
  PLAN_SIZE,
  SESSION_MAX,
  SESSION_MIN,
  SESSION_SIZE,
  WORKBENCH_MIN,
  writeSplitterSizes,
  type SplitterSizes
} from '@/features/agent/layout/splitter-sizes'
import { AgentTitlebar } from '@/features/agent/layout/titlebar'
import { AgentWorkbench } from '@/features/agent/layout/workbench'
import type { ScenarioKey } from '@/features/agent/model/scenarios'
import { parseParts, stringifyParts } from '@/features/agent/model/tools'
import { AgentSettings } from '@/features/agent/settings/settings'
import type { FilePartData } from '@/features/agent/types'
import { CSSVAR } from '@/themes/runtime/build'
import { useCalendarStore } from '@/stores/calendar'
import { useIntelligenceStore } from '@/stores/intelligence.ts'
import { useProviderStore } from '@/stores/provider'

interface PlanSelection {
  messageID: string
  partIndex: number
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findPlanSource(
  selection: PlanSelection | null,
  messages: { id: string; parts: string | null }[]
): PlanPaneSource | null {
  if (!selection) return null
  const target = messages.find(function (item) {
    return item.id === selection.messageID
  })
  if (!target) return null
  const parts = parseParts(target.parts)
  const part = parts[selection.partIndex]
  if (!part || part.type !== 'plan') return null
  return {
    messageID: selection.messageID,
    partIndex: selection.partIndex,
    data: part.data
  }
}

function Agent() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, updateSettingsOpen] = useState(false)
  const [contextFiles, updateContextFiles] = useState<FilePartData[]>([])
  const [sizes, updateSizes] = useState<SplitterSizes>(findSplitterSizes)
  const [isSearchOpen, updateSearchOpen] = useState(false)
  const [scenario, updateScenario] = useState<ScenarioKey>('general')
  const [planSelection, updatePlanSelection] = useState<PlanSelection | null>(null)
  const messages = useIntelligenceStore(function (state) {
    return state.messages
  })
  const planSource = findPlanSource(planSelection, messages)

  useEffect(function () {
    void useIntelligenceStore.getState().toReadWorkspaces()
    void useIntelligenceStore.getState().toReadWorkspaceFolders()
    void useIntelligenceStore.getState().toReadSessions()
    void useProviderStore.getState().toReadProviders()
  }, [])

  function findPopupContainer(_trigger?: HTMLElement) {
    return rootRef.current ?? document.body
  }

  function persistSizes(next: SplitterSizes) {
    updateSizes(next)
    writeSplitterSizes(next)
  }

  function handleResize(panelSizes: number[]) {
    const session = panelSizes[0] ?? sizes.session
    const plan = panelSizes[2] ?? sizes.plan
    updateSizes({
      session: session > 0 ? Math.min(SESSION_MAX, Math.max(SESSION_MIN, session)) : 0,
      plan: plan > 0 ? Math.min(PLAN_MAX, Math.max(PLAN_MIN, plan)) : 0
    })
  }

  function handleResizeEnd(panelSizes: number[]) {
    const session = panelSizes[0] ?? sizes.session
    const plan = panelSizes[2] ?? sizes.plan
    persistSizes({
      session: session > 0 ? Math.min(SESSION_MAX, Math.max(SESSION_MIN, session)) : 0,
      plan: plan > 0 ? Math.min(PLAN_MAX, Math.max(PLAN_MIN, plan)) : 0
    })
  }

  function handleCollapse(_collapsed: boolean[], panelSizes: number[]) {
    const session = panelSizes[0] ?? 0
    const plan = panelSizes[2] ?? 0
    persistSizes({
      session: session > SESSION_MIN / 2 ? session : 0,
      plan: plan > PLAN_MIN / 2 ? plan : 0
    })
    if (plan < PLAN_MIN / 2) updatePlanSelection(null)
  }

  function handleDraggerDoubleClick(index: number) {
    if (index === 0) return persistSizes({ ...sizes, session: SESSION_SIZE })

    if (index === 1) persistSizes({ ...sizes, plan: PLAN_SIZE })
  }

  function openPlanPane(source: PlanPaneSource) {
    updatePlanSelection({
      messageID: source.messageID,
      partIndex: source.partIndex
    })
    if (sizes.plan <= 0) {
      persistSizes({ ...sizes, plan: PLAN_SIZE })
    }
  }

  function closePlanPane() {
    updatePlanSelection(null)
    persistSizes({ ...sizes, plan: 0 })
  }

  async function handleTogglePlanItem(itemIndex: number) {
    if (!planSource) return
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === planSource.messageID
    })
    if (!target) return
    const parts = parseParts(target.parts)
    const part = parts[planSource.partIndex]
    if (!part || part.type !== 'plan') return
    const items = part.data.items.map(function (item, index) {
      return index === itemIndex ? { ...item, done: !item.done } : item
    })
    const data = { ...part.data, items }
    parts[planSource.partIndex] = { type: 'plan', data }
    await useIntelligenceStore
      .getState()
      .toUpdateMessage([{ id: planSource.messageID, parts: stringifyParts(parts) }])
  }

  async function handleWritePlanCalendar() {
    if (!planSource) return
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === planSource.messageID
    })
    if (!target) return
    const parts = parseParts(target.parts)
    const part = parts[planSource.partIndex]
    if (!part || part.type !== 'plan') return

    const base = dayjs(part.data.date || undefined).startOf('day')
    for (const item of part.data.items) {
      let start = base
      if (item.time) {
        const [hour, minute] = item.time.split(':').map(Number)
        start = base.hour(hour || 0).minute(minute || 0)
      }
      const end = item.time ? start.add(30, 'minute') : base.endOf('day')
      await useCalendarStore.getState().toWriteEvent({
        title: item.title,
        notes: '由 Agent 计划生成',
        startAt: start.valueOf(),
        endAt: end.valueOf(),
        entireDay: !item.time
      })
    }
  }

  return (
    <div
      ref={rootRef}
      className={clsx(styles.agent, CSSVAR.KEY)}>
      <AgentTitlebar className={styles.titlebar} />
      <div className={styles.body}>
        <Splitter
          className={styles.splitter}
          orientation="horizontal"
          lazy
          collapsible={{ motion: !prefersReducedMotion() }}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          onCollapse={handleCollapse}
          onDraggerDoubleClick={handleDraggerDoubleClick}>
          <Splitter.Panel
            size={sizes.session}
            min={SESSION_MIN}
            max={SESSION_MAX}
            collapsible>
            <AgentSidebar
              className={styles.sidebar}
              scenario={scenario}
              isSearchOpen={isSearchOpen}
              getPopupContainer={findPopupContainer}
              onScenarioChange={updateScenario}
              onSearchOpenChange={updateSearchOpen}
              onOpenSettings={function () {
                updateSettingsOpen(true)
              }}
            />
          </Splitter.Panel>
          <Splitter.Panel min={WORKBENCH_MIN}>
            <AgentWorkbench
              className={styles.workbench}
              scenario={scenario}
              contextFiles={contextFiles}
              getPopupContainer={findPopupContainer}
              onScenarioChange={updateScenario}
              onContextFilesChange={updateContextFiles}
              onOpenSettings={function () {
                updateSettingsOpen(true)
              }}
              onPlanOpen={openPlanPane}
            />
          </Splitter.Panel>
          <Splitter.Panel
            size={sizes.plan}
            min={PLAN_MIN}
            max={PLAN_MAX}
            collapsible>
            <AgentPlanPane
              className={styles.planPane}
              source={planSource}
              onClose={closePlanPane}
              onToggleItem={function (itemIndex) {
                void handleTogglePlanItem(itemIndex)
              }}
              onWriteCalendar={handleWritePlanCalendar}
            />
          </Splitter.Panel>
        </Splitter>
      </div>
      <AgentSettings
        open={settingsOpen}
        onClose={function () {
          updateSettingsOpen(false)
        }}
      />
    </div>
  )
}

export { Agent }
