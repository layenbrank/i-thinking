/**
 * Qoder 式会话搜索弹框：borderless Input + 键盘导航 + 结果列表
 */
import { Icon } from '@iconify/react/offline'
import { Button, Empty, Flex, Input, Modal, Typography, type InputRef } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { throttle } from 'lodash-es'
import { useEffect, useMemo, useRef, useState } from 'react'

import styles from '@/features/agent/layout/session-search.module.scss'
import {
  useIntelligenceStore,
  type AiSession,
  type AiWorkspace
} from '@/stores/intelligence.ts'

interface SessionSearchHit {
  session: AiSession
  workspaceTitle: string
  pathHint: string
}

interface SessionSearchProps {
  open: boolean
  onClose: () => void
  onSelect: (session: AiSession) => void
}

const NAVIGATE_THROTTLE_MS = 80

function truncatePath(path: string, max = 28) {
  if (path.length <= max) return path
  return path.slice(0, max - 1) + '…'
}

function SessionSearch(props: SessionSearchProps) {
  const sessions = useIntelligenceStore(function (state) {
    return state.sessions
  })
  const workspaces = useIntelligenceStore(function (state) {
    return state.workspaces
  })
  const workspaceFolders = useIntelligenceStore(function (state) {
    return state.workspaceFolders
  })

  const [keyword, updateKeyword] = useState('')
  const [navigation, updateNavigation] = useState(0)
  const inputRef = useRef<InputRef>(null)
  const hitsLengthRef = useRef(0)

  const workspaceByID = useMemo(
    function () {
      const map = new Map<string, AiWorkspace>()
      workspaces.forEach(function (workspace) {
        map.set(workspace.id, workspace)
      })
      return map
    },
    [workspaces]
  )

  const primaryPathByWorkspace = useMemo(
    function () {
      const map = new Map<string, string>()
      workspaceFolders.forEach(function (folder) {
        const current = map.get(folder.workspaceID)
        if (!current || folder.isPrimary) {
          map.set(folder.workspaceID, folder.path)
        }
      })
      return map
    },
    [workspaceFolders]
  )

  const hits: SessionSearchHit[] = useMemo(
    function () {
      const lower = keyword.trim().toLowerCase()
      const filtered = sessions
        .filter(function (session) {
          if (!lower) return true
          return session.title.toLowerCase().includes(lower)
        })
        .toSorted(function (a, b) {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return b.updatedAt - a.updatedAt
        })

      return filtered.map(function (session) {
        const workspace = session.workspaceID
          ? workspaceByID.get(session.workspaceID)
          : undefined
        const path = session.workspaceID
          ? primaryPathByWorkspace.get(session.workspaceID)
          : undefined
        const workspaceTitle = workspace?.title || '未分组'
        const pathHint = path
          ? `${workspaceTitle} · 本地 · ${truncatePath(path)}`
          : `${workspaceTitle} · 本地`
        return { session, workspaceTitle, pathHint }
      })
    },
    [sessions, keyword, workspaceByID, primaryPathByWorkspace]
  )

  useEffect(
    function () {
      hitsLengthRef.current = hits.length
    },
    [hits.length]
  )

  useEffect(
    function () {
      if (!props.open) {
        updateKeyword('')
        updateNavigation(0)
        return
      }
      queueMicrotask(function () {
        inputRef.current?.focus({ cursor: 'all' })
      })
    },
    [props.open]
  )

  useEffect(
    function () {
      updateNavigation(0)
    },
    [keyword]
  )

  const navigatePrev = useMemo(function () {
    return throttle(
      function () {
        updateNavigation(function (index) {
          const length = hitsLengthRef.current
          if (length <= 0) return 0
          return index <= 0 ? length - 1 : index - 1
        })
      },
      NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  const navigateNext = useMemo(function () {
    return throttle(
      function () {
        updateNavigation(function (index) {
          const length = hitsLengthRef.current
          if (length <= 0) return 0
          return index >= length - 1 ? 0 : index + 1
        })
      },
      NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  useEffect(
    function () {
      return function () {
        navigatePrev.cancel()
        navigateNext.cancel()
      }
    },
    [navigatePrev, navigateNext]
  )

  function openHit(hit?: SessionSearchHit) {
    const target = hit ?? hits[navigation]
    if (!target) return
    props.onSelect(target.session)
    props.onClose()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      navigatePrev()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      navigateNext()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      openHit()
    }
  }

  return (
    <Modal
      open={props.open}
      onCancel={props.onClose}
      footer={null}
      closable={false}
      centered
      width={640}
      destroyOnHidden
      className={styles.modal}
      classNames={{
        container: styles.container,
        body: styles.body
      }}
      getContainer={function () {
        return document.body
      }}
      afterOpenChange={function (open) {
        if (open) {
          queueMicrotask(function () {
            inputRef.current?.focus({ cursor: 'all' })
          })
        }
      }}>
      <div className={styles.inputRow}>
        <Input
          ref={inputRef}
          value={keyword}
          allowClear
          variant="borderless"
          placeholder="搜索任务标题或任务内容..."
          prefix={
            <Icon
              icon="ant-design:search-outlined"
              width={16}
              height={16}
              className={styles.searchIcon}
            />
          }
          className={styles.input}
          onChange={function (event) {
            updateKeyword(event.target.value)
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <Flex
        align="center"
        justify="space-between"
        className={styles.metaRow}>
        <Typography.Text
          type="secondary"
          className={styles.metaLabel}>
          所有任务
        </Typography.Text>
        <Flex
          align="center"
          gap={8}
          className={styles.hints}>
          <Flex
            align="center"
            gap={4}>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd>
            <Typography.Text type="secondary">选择</Typography.Text>
          </Flex>
          <Flex
            align="center"
            gap={4}>
            <kbd className={styles.kbd}>Enter</kbd>
            <Typography.Text type="secondary">打开</Typography.Text>
          </Flex>
          <Typography.Text type="secondary">{hits.length} 个</Typography.Text>
        </Flex>
      </Flex>

      <div className={styles.list}>
        {hits.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={keyword.trim() ? '无匹配任务' : '暂无任务'}
            className={styles.empty}
          />
        ) : (
          hits.map(function (hit, index) {
            const active = index === navigation
            return (
              <Button
                key={hit.session.id}
                type="text"
                block
                className={clsx(styles.hit, active && styles.hitActive)}
                onMouseEnter={function () {
                  updateNavigation(index)
                }}
                onClick={function () {
                  openHit(hit)
                }}>
                <Flex
                  align="center"
                  gap={12}
                  className={styles.hitInner}>
                  <Typography.Text
                    ellipsis
                    className={styles.hitTitle}>
                    {hit.session.title}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    ellipsis
                    className={styles.hitMeta}>
                    {hit.pathHint}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    className={styles.hitDate}>
                    {dayjs(hit.session.updatedAt).format('M月D日')}
                  </Typography.Text>
                </Flex>
              </Button>
            )
          })
        )}
      </div>
    </Modal>
  )
}

export { SessionSearch }
export type { SessionSearchProps, SessionSearchHit }