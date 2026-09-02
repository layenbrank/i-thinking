/**
 * 通用触发浮层：按 behaviorId 拉文件搜索或技能列表
 */
import { Icon } from '@iconify/react/offline'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type Ref } from 'react'

import styles from '@/features/agent/chat/trigger-popup.module.scss'
import {
  BEHAVIOR_PICK_FILE,
  BEHAVIOR_PICK_SKILL,
  findTriggerBehavior,
  type SenderChip,
  type TriggerMatch
} from '@/features/agent/chat/sender-trigger'
import { findFileIcon } from '@/features/agent/model/file-icon'
import { normalizePath } from '@/features/agent/model/workspace-path'
import { WorkspaceFiles, type SearchHit } from '@/lib/workspace-files'
import { WorkspaceSkills, type WorkspaceSkill } from '@/lib/workspace-skills'

interface TriggerPopupProps {
  match: TriggerMatch | null
  rootPaths: string[]
  /** 已插入 chip 的路径，浮层中不再可选 */
  excludedPaths?: string[]
  onPick: (chip: Omit<SenderChip, 'id'> & { id?: string }) => void
  onClose: () => void
}

interface TriggerPopupHandle {
  handleKeyDown: (event: { key: string }) => boolean
}

const SEARCH_LIMIT = 50
const DEBOUNCE_MS = 120

function formatFileLabel(relative: string, name: string) {
  const parts = normalizePath(relative).split('/').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
  }
  return name
}

function formatFileExtra(relative: string) {
  const normalized = normalizePath(relative)
  const max = 42
  if (normalized.length <= max) return normalized
  return `…${normalized.slice(-(max - 1))}`
}

interface PopupItem {
  key: string
  label: string
  extra?: string
  icon: string
  chip: Omit<SenderChip, 'id'>
}

function isPathExcluded(excluded: Set<string>, path: string, relative?: string) {
  if (excluded.has(normalizePath(path))) return true
  if (relative && excluded.has(normalizePath(relative))) return true
  return false
}

function TriggerPopupInner(props: TriggerPopupProps, ref: Ref<TriggerPopupHandle>) {
  const [fileHits, updateFileHits] = useState<SearchHit[]>([])
  const [skills, updateSkills] = useState<WorkspaceSkill[]>([])
  const [activeIndex, updateActiveIndex] = useState(0)
  const [loading, updateLoading] = useState(false)
  const seq = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const selectableRef = useRef<PopupItem[]>([])
  const onPickRef = useRef(props.onPick)
  const onCloseRef = useRef(props.onClose)

  useEffect(
    function () {
      onPickRef.current = props.onPick
      onCloseRef.current = props.onClose
    },
    [props.onPick, props.onClose]
  )

  useEffect(
    function () {
      activeIndexRef.current = activeIndex
    },
    [activeIndex]
  )

  const match = props.match
  const open = match !== null
  const behaviorId = match?.behaviorId ?? ''
  const query = match?.query ?? ''
  const kind = match?.kind ?? ''
  const hasRoots = props.rootPaths.length > 0
  const canSearchFiles = open && behaviorId === BEHAVIOR_PICK_FILE && hasRoots
  const canFetchSkills = open && behaviorId === BEHAVIOR_PICK_SKILL && hasRoots
  const excludedSet = useMemo(
    function () {
      return new Set((props.excludedPaths ?? []).map(normalizePath))
    },
    [props.excludedPaths]
  )

  useEffect(
    function () {
      if (!canSearchFiles) return

      let cancelled = false
      const nextSeq = ++seq.current
      const timer = window.setTimeout(function () {
        updateLoading(true)
        void WorkspaceFiles.search(props.rootPaths, query, SEARCH_LIMIT)
          .then(function (hits) {
            if (cancelled || seq.current !== nextSeq) return
            updateFileHits(hits)
            updateLoading(false)
          })
          .catch(function () {
            if (cancelled || seq.current !== nextSeq) return
            updateFileHits([])
            updateLoading(false)
          })
      }, DEBOUNCE_MS)

      return function () {
        cancelled = true
        window.clearTimeout(timer)
      }
    },
    [canSearchFiles, query, props.rootPaths]
  )

  useEffect(
    function () {
      if (!canFetchSkills) return

      let cancelled = false
      const nextSeq = ++seq.current
      void Promise.resolve()
        .then(function () {
          if (cancelled) return
          updateLoading(true)
          return WorkspaceSkills.fetchSkills(props.rootPaths)
        })
        .then(function (rows) {
          if (cancelled || seq.current !== nextSeq || rows === undefined) return
          updateSkills(rows)
          updateLoading(false)
        })
        .catch(function () {
          if (cancelled || seq.current !== nextSeq) return
          updateSkills([])
          updateLoading(false)
        })

      return function () {
        cancelled = true
      }
    },
    [canFetchSkills, props.rootPaths]
  )

  const isListLoading = loading && (canSearchFiles || canFetchSkills)

  const items: PopupItem[] = useMemo(
    function () {
      if (!match) return []
      const behavior = findTriggerBehavior(match.behaviorId)
      const prefix = behavior?.serializePrefix ?? match.char

      if (behaviorId === BEHAVIOR_PICK_FILE) {
        if (!hasRoots) {
          return [
            {
              key: '__empty__',
              label: '请先配置工作区文件夹',
              icon: 'mdi:folder-alert-outline',
              chip: { kind: 'file', label: '', value: '', meta: {} }
            }
          ]
        }
        if (fileHits.length === 0) {
          return [
            {
              key: '__none__',
              label: isListLoading ? '搜索中…' : query ? '无匹配文件' : '输入关键字搜索文件',
              icon: 'mdi:file-search-outline',
              chip: { kind: 'file', label: '', value: '', meta: {} }
            }
          ]
        }
        const available = fileHits.filter(function (hit) {
          return !isPathExcluded(excludedSet, hit.path, hit.relative)
        })
        if (available.length === 0) {
          return [
            {
              key: '__none__',
              label: '所选文件均已引用',
              icon: 'mdi:file-check-outline',
              chip: { kind: 'file', label: '', value: '', meta: {} }
            }
          ]
        }
        return available.map(function (hit) {
          const relative = normalizePath(hit.relative)
          return {
            key: normalizePath(hit.path),
            label: formatFileLabel(relative, hit.name),
            extra: formatFileExtra(relative),
            icon: findFileIcon(hit.name),
            chip: {
              kind: kind || 'file',
              label: hit.name,
              value: `${prefix}${relative}`,
              meta: { name: hit.name, relative, path: normalizePath(hit.path) }
            }
          }
        })
      }

      if (behaviorId === BEHAVIOR_PICK_SKILL) {
        if (!hasRoots) {
          return [
            {
              key: '__empty__',
              label: '请先配置工作区文件夹',
              icon: 'mdi:folder-alert-outline',
              chip: { kind: 'skill', label: '', value: '', meta: {} }
            }
          ]
        }
        const filtered = skills.filter(function (skill) {
          if (isPathExcluded(excludedSet, skill.path, skill.relative)) return false
          if (!query) return true
          const q = query.toLowerCase()
          return (
            skill.name.toLowerCase().includes(q) ||
            skill.description.toLowerCase().includes(q)
          )
        })
        if (filtered.length === 0) {
          return [
            {
              key: '__none__',
              label: isListLoading
                ? '加载中…'
                : skills.length > 0 && !query
                  ? '所选技能均已引用'
                  : query
                    ? '无匹配技能'
                    : '暂无技能',
              icon: 'mdi:hammer-wrench',
              chip: { kind: 'skill', label: '', value: '', meta: {} }
            }
          ]
        }
        return filtered.map(function (skill) {
          return {
            key: skill.id,
            label: skill.name,
            extra: skill.description,
            icon: 'mdi:hammer-wrench',
            chip: {
              kind: kind || 'skill',
              label: skill.name,
              value: `${prefix}${skill.name}`,
              meta: {
                name: skill.name,
                relative: normalizePath(skill.relative),
                path: normalizePath(skill.path),
                description: skill.description
              }
            }
          }
        })
      }

      return []
    },
    [
      match,
      behaviorId,
      kind,
      fileHits,
      skills,
      query,
      isListLoading,
      hasRoots,
      excludedSet
    ]
  )

  const selectable = useMemo(
    function () {
      return items.filter(function (item) {
        return !item.key.startsWith('__')
      })
    },
    [items]
  )

  const activeResetKey = `${match?.char ?? ''}\0${match?.query ?? ''}\0${match?.behaviorId ?? ''}\0${items.length}`
  const [prevActiveResetKey, updatePrevActiveResetKey] = useState(activeResetKey)
  if (prevActiveResetKey !== activeResetKey) {
    updatePrevActiveResetKey(activeResetKey)
    updateActiveIndex(0)
  }

  useEffect(
    function () {
      selectableRef.current = selectable
    },
    [selectable]
  )

  useEffect(
    function () {
      const root = listRef.current
      if (!root) return
      const active = root.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      active?.scrollIntoView({ block: 'nearest' })
    },
    [activeIndex]
  )

  function pickAt(index: number) {
    const item = selectableRef.current[index]
    if (!item || !item.chip.label) return
    onPickRef.current(item.chip)
  }

  const openRef = useRef(false)

  useEffect(
    function () {
      openRef.current = open
    },
    [open]
  )

  useImperativeHandle(ref, function () {
    return {
      handleKeyDown: function (event) {
        if (!openRef.current) return false
        if (event.key === 'Escape') {
          onCloseRef.current()
          return true
        }
        const rows = selectableRef.current
        if (rows.length === 0) {
          // 空态：拦截 Enter，避免误发送
          if (event.key === 'Enter') return true
          return false
        }
        if (event.key === 'ArrowDown') {
          updateActiveIndex(function (index) {
            return (index + 1) % rows.length
          })
          return true
        }
        if (event.key === 'ArrowUp') {
          updateActiveIndex(function (index) {
            return (index - 1 + rows.length) % rows.length
          })
          return true
        }
        if (event.key === 'Enter') {
          pickAt(activeIndexRef.current)
          return true
        }
        return false
      }
    }
  })

  if (!open) return null

  return (
    <div
      className={styles.root}
      role="listbox"
      aria-label="触发建议">
      <div
        ref={listRef}
        className={styles.list}>
        {items.map(function (item) {
          const disabled = item.key.startsWith('__')
          const selectIndex = selectable.findIndex(function (row) {
            return row.key === item.key
          })
          const isActive = !disabled && selectIndex === activeIndex
          return (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={isActive}
              data-index={disabled ? undefined : selectIndex}
              className={styles.item}
              data-active={isActive ? 'true' : undefined}
              data-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              onMouseDown={function (event) {
                event.preventDefault()
              }}
              onClick={function () {
                if (disabled) return
                pickAt(selectIndex)
              }}>
              <Icon
                icon={item.icon}
                width={16}
                height={16}
                className={styles.icon}
              />
              <span className={styles.label}>{item.label}</span>
              {item.extra ? (
                <span
                  className={styles.extra}
                  title={item.extra}>
                  {item.extra}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const TriggerPopup = forwardRef(TriggerPopupInner)
TriggerPopup.displayName = 'TriggerPopup'

export { TriggerPopup }
export type { TriggerPopupHandle, TriggerPopupProps }
