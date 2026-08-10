import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { useEffect, useState } from 'react'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { MergeBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/merge-board'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { MorphIpc } from '@/lib/morph-ipc'
import { useMorphStore } from '@/stores/morph.ts'

function MergeTask() {
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

  const inputsKey = inputs.join('\0')
  const [coverState, setCoverState] = useState<{
    key: string
    covers: Record<string, string>
  }>({ key: '', covers: {} })
  const covers = coverState.key === inputsKey ? coverState.covers : {}
  const isCoverLoading = inputs.length > 0 && coverState.key !== inputsKey

  useEffect(
    function () {
      if (!inputs.length) return
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
    [inputs, inputsKey]
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

  const canSubmit = inputs.length >= 2 && Boolean(output)
  const meta =
    inputs.length === 0
      ? '拖入或添加至少 2 个 PDF'
      : `共 ${inputs.length} 个文件 · 拖拽卡片调整顺序`

  return (
    <OperationStage
      title="合并 PDF"
      icon="ant-design:compress-outlined"
      meta={meta}
      onBack={toCloseOperation}
      extra={
        <PathField
          compact
          label="输出文件"
          value={output}
          placeholder="选择合并输出路径"
          onBrowse={function () {
            void onSelectOutput()
          }}
        />
      }
      hint={
        error ??
        (canSubmit ? undefined : inputs.length < 2 ? '至少添加 2 个 PDF' : '请选择输出路径')
      }
      submitLabel="开始合并"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void toExecuteMerge()
      }}>
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
    </OperationStage>
  )
}

export { MergeTask }
