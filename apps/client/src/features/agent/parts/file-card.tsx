/**
 * 文件部件：上下文文件卡片，支持按需加载预览
 */
import { Icon } from '@iconify/react/offline'
import { Button, Flex, Spin, Tag, Typography } from 'antd'
import { useState } from 'react'

import type { FilePartData } from '@/features/agent/types'
import { FileIpc } from '@/lib/file-ipc'

interface FileCardProps {
  data: FilePartData
}

function formatSize(size?: number) {
  if (size === undefined) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function FileCard(props: FileCardProps) {
  const { data } = props
  const [preview, updatePreview] = useState<string | null>(null)
  const [loading, updateLoading] = useState(false)

  async function handleTogglePreview() {
    if (preview !== null) {
      updatePreview(null)
      return
    }
    updateLoading(true)
    try {
      updatePreview(await FileIpc.read(data.path))
    } catch (error) {
      updatePreview(`读取失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      updateLoading(false)
    }
  }

  return (
    <Flex
      vertical
      gap={6}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--ith-color-border)',
        borderRadius: 'var(--ith-border-radius)',
        background: 'var(--ith-color-bg-container)'
      }}>
      <Flex align="center" gap={8}>
        <Icon icon="ant-design:file-text-outlined" />
        <Typography.Text
          strong
          style={{ flex: 1 }}
          ellipsis={{ tooltip: data.path }}>
          {data.name}
        </Typography.Text>
        {data.size !== undefined && <Tag>{formatSize(data.size)}</Tag>}
        <Button
          size="small"
          type="text"
          onClick={function () {
            void handleTogglePreview()
          }}>
          {preview !== null ? '收起' : '预览'}
        </Button>
      </Flex>
      <Typography.Text
        type="secondary"
        ellipsis={{ tooltip: data.path }}>
        {data.path}
      </Typography.Text>
      {data.summary && <Typography.Text type="secondary">{data.summary}</Typography.Text>}
      {loading && <Spin size="small" />}
      {preview !== null && (
        <pre
          style={{
            margin: 0,
            maxHeight: 240,
            overflow: 'auto',
            padding: 8,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: 'var(--ith-color-bg-layout)',
            borderRadius: 'var(--ith-border-radius-sm)'
          }}>
          {preview}
        </pre>
      )}
    </Flex>
  )
}

export { FileCard }
export type { FileCardProps }
