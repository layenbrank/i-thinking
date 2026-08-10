import { useEffect } from 'react'

import { ConvertTask } from '@/features/magnetic-tiles/morph/workspace/tasks/convert-task'
import { ExtractTask } from '@/features/magnetic-tiles/morph/workspace/tasks/extract-task'
import { MergeTask } from '@/features/magnetic-tiles/morph/workspace/tasks/merge-task'
import { OrganizeTask } from '@/features/magnetic-tiles/morph/workspace/tasks/organize-task'
import { SplitTask } from '@/features/magnetic-tiles/morph/workspace/tasks/split-task'
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
