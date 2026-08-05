// @ts-nocheck
import { Extension } from '@tiptap/core'
import type { TableHandlesState } from '@/components/tiptap-node/table-node/extensions/table-handle/table-handle-plugin.ts'
import {
  TableHandlePlugin,
  tableHandlePluginKey
} from '@/components/tiptap-node/table-node/extensions/table-handle/table-handle-plugin.ts'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableHandle: {
      freezeHandles: () => ReturnType
      unfreezeHandles: () => ReturnType
    }
  }

  interface EditorEvents {
    tableHandleState: TableHandlesState
  }
}

export const TableHandleExtension = Extension.create({
  name: 'tableHandleExtension',

  addCommands() {
    return {
      freezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, true)
          return true
        },

      unfreezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, false)
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    return [
      TableHandlePlugin(editor, (state) => {
        this.editor.emit('tableHandleState', state)
      })
    ]
  }
})
