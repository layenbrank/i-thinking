import { useEffect } from 'react'

import { ConvertTask } from '@/views/morph/workspace/tasks/convert-task.tsx'
import { ExtractTask } from '@/views/morph/workspace/tasks/extract-task.tsx'
import { MergeTask } from '@/views/morph/workspace/tasks/merge-task.tsx'
import { OrganizeTask } from '@/views/morph/workspace/tasks/organize-task.tsx'
import { SplitTask } from '@/views/morph/workspace/tasks/split-task.tsx'
import { useMorphStore } from '@/stores/morph.ts'

function TaskWorkbench() {
  const activeOperation = useMorphStore(function (s) {
    return s.activeOperation
  })
  const toCloseOperation = useMorphStore(function (s) {
    return s.toCloseOperation
  })

  useEffect(
    function () {
      if (!activeOperation) return

      function onKeyDown(event: KeyboardEvent) {
        if (event.key !== 'Escape') return
        event.preventDefault()
        toCloseOperation()
      }

      window.addEventListener('keydown', onKeyDown)
      return function () {
        window.removeEventListener('keydown', onKeyDown)
      }
    },
    [activeOperation, toCloseOperation]
  )

  if (activeOperation === 'merge') return <MergeTask />
  if (activeOperation === 'split') return <SplitTask />
  if (activeOperation === 'convert') return <ConvertTask />
  if (activeOperation === 'organize') return <OrganizeTask />
  if (activeOperation === 'extract') return <ExtractTask />
  return null
}

export { TaskWorkbench }
