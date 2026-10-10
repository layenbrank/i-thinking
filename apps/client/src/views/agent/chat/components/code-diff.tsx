/**
 * 代码编辑部件：展示目标路径与修改后内容，确认后经 corex file.write 落盘
 */
import { Icon } from '@iconify/react/offline'
import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Spinner } from '@i-thinking/design/components/spinner'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
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
  return EXT_LANG[ext] ?? 'text'
}

function CodeDiff(props: CodeDiffProps) {
  const { part, onApply } = props
  const [applying, updateApplying] = useState(false)
  const applied = Boolean(part.data.applied)

  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon
          icon="lucide:code"
          className="text-muted-foreground size-4 shrink-0"
        />
        <span
          className="min-w-0 flex-1 truncate text-sm"
          title={part.data.path}>
          {part.data.path}
        </span>
        {applied ? (
          <Badge variant="secondary">
            <Icon icon="lucide:check" />
            已应用
          </Badge>
        ) : (
          <Button
            size="sm"
            disabled={applying}
            onClick={async function () {
              updateApplying(true)
              try {
                await onApply()
              } finally {
                updateApplying(false)
              }
            }}>
            {applying ? <Spinner /> : null}
            应用到文件
          </Button>
        )}
      </div>
      <div className="max-h-90 overflow-auto">
        <SyntaxHighlighter
          language={toLang(part.data.path)}
          style={VSCODE}
          customStyle={{ margin: 0, border: 'none', fontSize: 13 }}>
          {part.data.after}
        </SyntaxHighlighter>
      </div>
      <span className="text-muted-foreground text-xs">应用时将整文件覆写并自动备份原文件</span>
    </div>
  )
}

export { CodeDiff }
export type { CodeDiffProps }
