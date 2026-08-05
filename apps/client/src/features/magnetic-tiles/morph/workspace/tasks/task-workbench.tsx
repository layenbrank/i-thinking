import { useEffect } from 'react'

import { ConvertTask } from '@/features/magnetic-tiles/morph/workspace/tasks/convert-task'
import { MergeTask } from '@/features/magnetic-tiles/morph/workspace/tasks/merge-task'
import { SplitTask } from '@/features/magnetic-tiles/morph/workspace/tasks/split-task'
import { useMorphStore } from '@/stores/morph.ts'

function TaskWorkbench() {
  const mergeOpen = useMorphStore(function (s) {
    return s.mergeModal.open
  })
  const splitOpen = useMorphStore(function (s) {
    return s.splitModal.open
  })
  const convertOpen = useMorphStore(function (s) {
    return s.convertModal.open
  })
  const closeMergeModal = useMorphStore(function (s) {
    return s.closeMergeModal
  })
  const closeSplitModal = useMorphStore(function (s) {
    return s.closeSplitModal
  })
  const closeConvertModal = useMorphStore(function (s) {
    return s.closeConvertModal
  })

  useEffect(
    function () {
      if (!mergeOpen && !splitOpen && !convertOpen) return

      function onKeyDown(event: KeyboardEvent) {
        if (event.key !== 'Escape') return
        event.preventDefault()
        if (mergeOpen) closeMergeModal()
        else if (splitOpen) closeSplitModal()
        else if (convertOpen) closeConvertModal()
      }

      window.addEventListener('keydown', onKeyDown)
      return function () {
        window.removeEventListener('keydown', onKeyDown)
      }
    },
    [
      mergeOpen,
      splitOpen,
      convertOpen,
      closeMergeModal,
      closeSplitModal,
      closeConvertModal
    ]
  )

  if (mergeOpen) return <MergeTask />
  if (splitOpen) return <SplitTask />
  if (convertOpen) return <ConvertTask />
  return null
}

export { TaskWorkbench }
