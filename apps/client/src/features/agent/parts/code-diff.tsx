/**
 * 代码编辑部件：展示目标路径与修改后内容，确认后经 corex file.write 落盘
 */
import { CodeHighlighter } from '@ant-design/x'
import { Icon } from '@iconify/react/offline'
import { Button, Flex, Tag, Typography } from 'antd'
import { useState } from 'react'
import { vs as VSCODE } from 'react-syntax-highlighter/dist/esm/styles/prism'

import type { DiffPart } from '@/features/agent/types'

interface CodeDiffProps {
  part: DiffPart
  onApply: () => Promise<void>
}

const EXT_LANG: Record<string, string> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  jsx: 'jsx',
  rs: 'rust',
  json: 'json',
  md: 'markdown',
  py: 'python',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yaml: 'yaml',
  toml: 'toml'
}

function toLang(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LANG[ext] ?? ''
}

function CodeDiff(props: CodeDiffProps) {
  const { part, onApply } = props
  const [applying, updateApplying] = useState(false)
  const applied = Boolean(part.data.applied)

  return (
    <Flex
      vertical
      gap={8}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--ith-color-border)',
        borderRadius: 'var(--ith-border-radius)',
        background: 'var(--ith-color-bg-container)'
      }}>
      <Flex align="center" gap={8}>
        <Icon icon="ant-design:code-outlined" />
        <Typography.Text
          style={{ flex: 1 }}
          ellipsis={{ tooltip: part.data.path }}>
          {part.data.path}
        </Typography.Text>
        {applied ? (
          <Tag
            icon={<Icon icon="ant-design:check-outlined" />}
            color="success">
            已应用
          </Tag>
        ) : (
          <Button
            size="small"
            type="primary"
            loading={applying}
            onClick={async function () {
              updateApplying(true)
              try {
                await onApply()
              } finally {
                updateApplying(false)
              }
            }}>
            应用到文件
          </Button>
        )}
      </Flex>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <CodeHighlighter
          highlightProps={{
            style: VSCODE,
            customStyle: { border: 'none', margin: 0 }
          }}
          lang={toLang(part.data.path)}>
          {part.data.after}
        </CodeHighlighter>
      </div>
      <Typography.Text type="secondary">
        应用时将整文件覆写并自动备份原文件
      </Typography.Text>
    </Flex>
  )
}

export { CodeDiff }
export type { CodeDiffProps }
