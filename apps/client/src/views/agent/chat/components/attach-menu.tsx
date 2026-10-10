/**
 * Composer + 双栏：工作区浏览/搜索 + 技能列表
 */
import { Icon } from '@iconify/react/offline'
import { Input } from '@i-thinking/design/components/input'
import { Spinner } from '@i-thinking/design/components/spinner'
import { clsx } from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import styles from './attach-menu.module.scss'
import { findEntryIcon, findFileIcon, findFolderIcon } from '@/features/agent/model/file-icon'
import type { FilePartData } from '@/features/agent/types'
import { WorkspaceFiles, type DirEntry, type SearchHit } from '@/lib/workspace-files'
import { WorkspaceSkills, type WorkspaceSkill } from '@/lib/workspace-skills'

type AttachCategory = 'goal' | 'plan' | 'files' | 'plugins' | 'skills'

interface WorkspaceRoot {
  id: string
  path: string
  label: string
}

interface AttachMenuProps {
  roots: WorkspaceRoot[]
  category: AttachCategory
  onCategoryChange: (category: AttachCategory) => void
  initialQuery?: string
  onAttach: (file: FilePartData, relative?: string) => void
  onPickFile?: (relative: string) => void
}

const CATEGORIES: Array<{
  key: AttachCategory
  label: string
  icon: string
  enabled: boolean
}> = [
  { key: 'goal', label: '目标', icon: 'mdi:target', enabled: false },
  { key: 'plan', label: '计划', icon: 'mdi:clipboard-text-outline', enabled: false },
  { key: 'files', label: '工作区', icon: 'mdi:folder-outline', enabled: true },
  { key: 'plugins', label: '插件', icon: 'mdi:puzzle-outline', enabled: false },
  { key: 'skills', label: '技能', icon: 'mdi:hammer-wrench', enabled: true }
]

function basename(path: string) {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts.filter(Boolean).pop() ?? path
}

function rootLabel(path: string) {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
  }
  return parts[parts.length - 1] ?? path
}

function parentRelative(relative: string) {
  const normalized = relative.replace(/\\/g, '/').replace(/\/+$/, '')
  const index = normalized.lastIndexOf('/')
  if (index < 0) return ''
  return normalized.slice(0, index)
}

function AttachMenu(props: AttachMenuProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [activeRoot, updateActiveRoot] = useState<WorkspaceRoot | null>(null)
  const [relative, updateRelative] = useState('')
  const [entries, updateEntries] = useState<DirEntry[]>([])
  const [hits, updateHits] = useState<SearchHit[]>([])
  const [skills, updateSkills] = useState<WorkspaceSkill[]>([])
  const [query, updateQuery] = useState(props.initialQuery ?? '')
  const [loading, updateLoading] = useState(false)
  const searchSeq = useRef(0)

  const rootPaths = useMemo(
    function () {
      return props.roots.map(function (item) {
        return item.path
      })
    },
    [props.roots]
  )

  useEffect(
    function () {
      if (props.initialQuery !== undefined) {
        updateQuery(props.initialQuery)
      }
    },
    [props.initialQuery]
  )

  useEffect(
    function () {
      if (props.category !== 'files') return
      if (props.roots.length === 1 && !activeRoot) {
        updateActiveRoot(props.roots[0])
      }
    },
    [props.category, props.roots, activeRoot]
  )

  useEffect(
    function () {
      if (props.category !== 'files' || !activeRoot) return
      const trimmed = query.trim()
      if (trimmed) return
      let cancelled = false
      updateLoading(true)
      void WorkspaceFiles.listDir(activeRoot.path, relative)
        .then(function (next) {
          if (!cancelled) updateEntries(next)
        })
        .catch(function (error) {
          if (!cancelled) {
            toast.error(typeof error === 'string' ? error : '无法读取目录')
            updateEntries([])
          }
        })
        .finally(function () {
          if (!cancelled) updateLoading(false)
        })
      return function () {
        cancelled = true
      }
    },
    [props.category, activeRoot, relative, query]
  )

  useEffect(
    function () {
      if (props.category !== 'files') return
      const trimmed = query.trim()
      if (!trimmed) {
        updateHits([])
        return
      }
      if (rootPaths.length === 0) return
      const seq = ++searchSeq.current
      updateLoading(true)
      const timer = window.setTimeout(function () {
        void WorkspaceFiles.search(rootPaths, trimmed, 50)
          .then(function (next) {
            if (searchSeq.current !== seq) return
            updateHits(next)
          })
          .catch(function (error) {
            if (searchSeq.current !== seq) return
            toast.error(typeof error === 'string' ? error : '搜索失败')
            updateHits([])
          })
          .finally(function () {
            if (searchSeq.current === seq) updateLoading(false)
          })
      }, 150)
      return function () {
        window.clearTimeout(timer)
      }
    },
    [props.category, query, rootPaths]
  )

  useEffect(
    function () {
      if (props.category !== 'skills') return
      if (rootPaths.length === 0) {
        updateSkills([])
        return
      }
      let cancelled = false
      updateLoading(true)
      void WorkspaceSkills.fetchSkills(rootPaths)
        .then(function (next) {
          if (!cancelled) updateSkills(next)
        })
        .catch(function (error) {
          if (!cancelled) {
            toast.error(typeof error === 'string' ? error : '无法加载技能')
            updateSkills([])
          }
        })
        .finally(function () {
          if (!cancelled) updateLoading(false)
        })
      return function () {
        cancelled = true
      }
    },
    [props.category, rootPaths]
  )

  useEffect(
    function () {
      if (props.category === 'files' || props.category === 'skills') {
        window.setTimeout(function () {
          searchRef.current?.focus()
        }, 0)
      }
    },
    [props.category]
  )

  const filteredSkills = useMemo(
    function () {
      const trimmed = query.trim().toLowerCase()
      if (!trimmed) return skills
      return skills.filter(function (skill) {
        return (
          skill.name.toLowerCase().includes(trimmed) ||
          skill.description.toLowerCase().includes(trimmed)
        )
      })
    },
    [skills, query]
  )

  function handleAttachPath(path: string, name: string, relativePath?: string) {
    const relative = relativePath ? relativePath.replace(/\\/g, '/') : undefined
    props.onAttach({ path: path.replace(/\\/g, '/'), name }, relative)
    if (relative) {
      props.onPickFile?.(relative)
    }
  }

  function handleEnterRoot(root: WorkspaceRoot) {
    updateActiveRoot(root)
    updateRelative('')
    updateQuery('')
  }

  function handleEnterDir(entry: DirEntry) {
    updateRelative(entry.relative)
    updateQuery('')
  }

  function handleBack() {
    if (relative) {
      updateRelative(parentRelative(relative))
      return
    }
    if (props.roots.length > 1) {
      updateActiveRoot(null)
    }
  }

  function handleSkillFooter(kind: 'manage' | 'explore') {
    toast.info(kind === 'manage' ? '管理技能即将推出' : '探索更多技能即将推出')
  }

  const isSearchMode = props.category === 'files' && query.trim().length > 0
  const showRootPicker =
    props.category === 'files' && !activeRoot && props.roots.length > 1 && !isSearchMode

  return (
    <div className={styles.shell}>
      <div className={styles.aside}>
        {CATEGORIES.map(function (item) {
          const isActive = props.category === item.key
          return (
            <button
              key={item.key}
              type="button"
              className={clsx(styles.asideItem, isActive && styles.asideActive)}
              disabled={!item.enabled}
              onClick={function () {
                if (!item.enabled) {
                  toast.info('即将推出')
                  return
                }
                props.onCategoryChange(item.key)
                updateQuery('')
              }}>
              <span className={styles.asideIcon}>
                <Icon
                  icon={item.icon}
                  width={15}
                  height={15}
                />
              </span>
              <span className={styles.asideLabel}>{item.label}</span>
              {item.key === 'files' || item.key === 'skills' ? (
                <Icon
                  icon="mdi:chevron-right"
                  width={14}
                  height={14}
                  className={styles.asideChevron}
                />
              ) : null}
            </button>
          )
        })}
      </div>
      <div className={styles.main}>
        {props.category === 'files' ? (
          <>
            <div className={styles.searchWrap}>
              <div className={styles.searchField}>
                <Icon
                  icon="mdi:magnify"
                  className={styles.searchIcon}
                  width={15}
                  height={15}
                />
                <Input
                  ref={searchRef}
                  placeholder="搜索文件"
                  className={styles.searchInput}
                  value={query}
                  onChange={function (event) {
                    updateQuery(event.target.value)
                  }}
                />
              </div>
            </div>
            {!isSearchMode && activeRoot && (relative || props.roots.length > 1) ? (
              <button
                type="button"
                className={styles.back}
                onClick={handleBack}>
                <Icon
                  icon="mdi:arrow-left"
                  width={14}
                  height={14}
                />
                <span>{relative ? '返回上级目录' : '返回工作区列表'}</span>
              </button>
            ) : null}
            <div className={styles.list}>
              {loading ? (
                <div className={styles.loading}>
                  <Spinner />
                </div>
              ) : showRootPicker ? (
                props.roots.map(function (root) {
                  return (
                    <button
                      key={root.id}
                      type="button"
                      className={styles.row}
                      onClick={function () {
                        handleEnterRoot(root)
                      }}>
                      <span className={clsx(styles.rowIconBadge, styles.rowIconBadgeDir)}>
                        <Icon
                          icon={findFolderIcon()}
                          width={16}
                          height={16}
                        />
                      </span>
                      <span className={styles.rowTitle}>{root.label}</span>
                      <Icon
                        icon="mdi:chevron-right"
                        width={16}
                        height={16}
                        className={styles.rowChevron}
                      />
                    </button>
                  )
                })
              ) : isSearchMode ? (
                hits.length === 0 ? (
                  <p className={styles.empty}>无匹配文件</p>
                ) : (
                  hits.map(function (hit) {
                    return (
                      <button
                        key={hit.path}
                        type="button"
                        className={styles.row}
                        onClick={function () {
                          handleAttachPath(hit.path, hit.name, hit.relative)
                        }}>
                        <span className={styles.rowIconBadge}>
                          <Icon
                            icon={findFileIcon(hit.name)}
                            width={16}
                            height={16}
                          />
                        </span>
                        <span className={styles.rowBody}>
                          <span className={styles.rowTitle}>{hit.name}</span>
                          <span className={styles.rowMetaPath}>{hit.relative}</span>
                        </span>
                        <span className={styles.rowAdd}>
                          <Icon
                            icon="mdi:plus"
                            width={14}
                            height={14}
                          />
                        </span>
                      </button>
                    )
                  })
                )
              ) : !activeRoot ? (
                <p className={styles.empty}>请先配置工作区</p>
              ) : entries.length === 0 ? (
                <p className={styles.empty}>空目录</p>
              ) : (
                entries.map(function (entry) {
                  const isDir = entry.kind === 'dir'
                  return (
                    <button
                      key={entry.path}
                      type="button"
                      className={styles.row}
                      onClick={function () {
                        if (isDir) {
                          handleEnterDir(entry)
                          return
                        }
                        handleAttachPath(entry.path, entry.name, entry.relative)
                      }}>
                      {isDir ? (
                        <Icon
                          icon="mdi:chevron-right"
                          width={14}
                          height={14}
                          className={styles.rowChevron}
                        />
                      ) : (
                        <span className={styles.rowChevronSpacer} />
                      )}
                      <span className={clsx(styles.rowIconBadge, isDir && styles.rowIconBadgeDir)}>
                        <Icon
                          icon={findEntryIcon(entry.name, entry.kind)}
                          width={16}
                          height={16}
                        />
                      </span>
                      <span className={styles.rowTitle}>{entry.name}</span>
                      {!isDir ? (
                        <span className={styles.rowAdd}>
                          <Icon
                            icon="mdi:plus"
                            width={14}
                            height={14}
                          />
                        </span>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </>
        ) : null}

        {props.category === 'skills' ? (
          <>
            <div className={styles.searchWrap}>
              <div className={styles.searchField}>
                <Icon
                  icon="mdi:magnify"
                  className={styles.searchIcon}
                  width={15}
                  height={15}
                />
                <Input
                  ref={searchRef}
                  placeholder="搜索技能"
                  className={styles.searchInput}
                  value={query}
                  onChange={function (event) {
                    updateQuery(event.target.value)
                  }}
                />
              </div>
            </div>
            <div className={styles.list}>
              {loading ? (
                <div className={styles.loading}>
                  <Spinner />
                </div>
              ) : filteredSkills.length === 0 ? (
                <p className={styles.empty}>未发现技能</p>
              ) : (
                filteredSkills.map(function (skill) {
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={styles.row}
                      onClick={function () {
                        handleAttachPath(skill.path, skill.name, skill.relative)
                      }}>
                      <span className={styles.rowIconBadge}>
                        <Icon
                          icon="mdi:hammer-wrench"
                          width={16}
                          height={16}
                        />
                      </span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{skill.name}</span>
                        {skill.description ? (
                          <span className={styles.rowMeta}>{skill.description}</span>
                        ) : null}
                      </span>
                      <span className={styles.rowAdd}>
                        <Icon
                          icon="mdi:plus"
                          width={14}
                          height={14}
                        />
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.footerItem}
                onClick={function () {
                  handleSkillFooter('manage')
                }}>
                <Icon
                  icon="mdi:cog-outline"
                  width={15}
                  height={15}
                />
                管理技能
              </button>
              <button
                type="button"
                className={styles.footerItem}
                onClick={function () {
                  handleSkillFooter('explore')
                }}>
                <Icon
                  icon="mdi:compass-outline"
                  width={15}
                  height={15}
                />
                探索更多技能
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export { AttachMenu, basename, rootLabel }
export type { AttachCategory, AttachMenuProps, WorkspaceRoot }
