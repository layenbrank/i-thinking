import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Segmented, Typography, type SegmentedProps } from 'antd'
import { useEffect, useState } from 'react'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { MergeBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/merge-board'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { MorphIpc } from '@/lib/morph-ipc'
import { useMorphStore } from '@/stores/morph.ts'

function MergeTask() {
  const mode = useMorphStore(function (s) {
    return s.mergeModal.mode
  })
  const inputs = useMorphStore(function (s) {
    return s.mergeModal.inputs
  })
  const output = useMorphStore(function (s) {
    return s.mergeModal.output
  })
  const loading = useMorphStore(function (s) {
    return s.mergeModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.mergeModal.error
  })
  const toCloseOperation = useMorphStore(function (s) {
    return s.toCloseOperation
  })
  const toPatchMerge = useMorphStore(function (s) {
    return s.toPatchMerge
  })
  const toExecuteMerge = useMorphStore(function (s) {
    return s.toExecuteMerge
  })
  const toExecuteStack = useMorphStore(function (s) {
    return s.toExecuteStack
  })
  const file = useMorphStore(function (s) {
    return s.file
  })
  const fileName = file?.path.split(/[\\/]/).pop() ?? ''
  const isPages = mode === 'pages'

  const inputsKey = inputs.join('\0')
  const [coverState, setCoverState] = useState<{
    key: string
    covers: Record<string, string>
  }>({ key: '', covers: {} })
  const covers = coverState.key === inputsKey ? coverState.covers : {}
  const isCoverLoading = inputs.length > 0 && coverState.key !== inputsKey

  useEffect(
    function () {
      if (isPages || !inputs.length) return
      const key = inputs.join('\0')
      let cancelled = false
      void Promise.all(
        inputs.map(async function (path) {
          try {
            const page = await MorphIpc.toRender(path, 0, 0.5)
            return [path, page.base64] as const
          } catch {
            return [path, ''] as const
          }
        })
      ).then(function (entries) {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const [path, data] of entries) {
          if (data) next[path] = data
        }
        setCoverState({ key, covers: next })
      })
      return function () {
        cancelled = true
      }
    },
    [isPages, inputs, inputsKey]
  )

  async function onAddFiles() {
    const selected = await dialogOpen({
      title: '选择要合并的 PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      multiple: true
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    toPatchMerge({
      inputs: [
        ...inputs,
        ...paths.filter(function (path) {
          return !inputs.includes(path)
        })
      ]
    })
  }

  async function onSelectOutput() {
    const selected = await dialogSave({
      title: '选择合并输出路径',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (typeof selected === 'string') toPatchMerge({ output: selected })
  }

  function onReorder(from: number, to: number) {
    const next = inputs.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    toPatchMerge({ inputs: next })
  }

  function onRemove(index: number) {
    toPatchMerge({
      inputs: inputs.filter(function (_path, i) {
        return i !== index
      })
    })
  }

  const canSubmit = isPages
    ? Boolean(file) && Boolean(output)
    : inputs.length >= 2 && Boolean(output)
  const meta = isPages
    ? file
      ? `当前文件：${fileName}`
      : '未打开文件'
    : inputs.length === 0
      ? '拖入或添加至少 2 个 PDF'
      : `共 ${inputs.length} 个文件 · 拖拽卡片调整顺序`

  function onUpdateMode(value: SegmentedProps['value']) {
    if (value !== 'files' && value !== 'pages') return
    toPatchMerge({ mode: value, error: null })
  }

  return (
    <OperationStage
      title="合并 PDF"
      icon="ant-design:compress-outlined"
      meta={meta}
      onBack={toCloseOperation}
      extra={
        <>
          <Segmented
            value={mode}
            onChange={onUpdateMode}
            options={[
              { label: '合并文件', value: 'files' },
              { label: '合并页面', value: 'pages' }
            ]}
          />
          <PathField
            compact
            label="输出文件"
            value={output}
            placeholder="选择合并输出路径"
            onBrowse={function () {
              void onSelectOutput()
            }}
          />
        </>
      }
      hint={
        error ??
        (canSubmit
          ? undefined
          : isPages
            ? file
              ? '请选择输出路径'
              : '请先在左侧打开 PDF'
            : inputs.length < 2
              ? '至少添加 2 个 PDF'
              : '请选择输出路径')
      }
      submitLabel="开始合并"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        if (isPages) {
          void toExecuteStack()
          return
        }
        void toExecuteMerge()
      }}>
      {isPages ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textAlign: 'center'
          }}>
          {file ? (
            <>
              <Typography.Text strong>{fileName}</Typography.Text>
              <Typography.Text type="secondary">
                相邻两页将上下拼接为一页（输出为图片页）
              </Typography.Text>
            </>
          ) : (
            <Typography.Text type="secondary">请先在左侧打开 PDF</Typography.Text>
          )}
        </div>
      ) : (
        <MergeBoard
          inputs={inputs}
          covers={covers}
          isCoverLoading={isCoverLoading}
          onReorder={onReorder}
          onRemove={onRemove}
          onAdd={function () {
            void onAddFiles()
          }}
        />
      )}
    </OperationStage>
  )
}

export { MergeTask }
